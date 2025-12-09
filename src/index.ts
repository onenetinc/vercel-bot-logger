/**
 * Main Cloud Function entry point
 * Google Cloud Functions (2nd gen) HTTP handler
 */

import type { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'
import { BigQueryService } from './services/bigquery.service'
import { VercelLogEntry } from './types/vercel.types'
import { transformLogToBigQuery } from './utils/log-transformer'
import { verifySignature } from './utils/vercel-auth'

// Environment variables (required)
const GCP_PROJECT = process.env.GCP_PROJECT!
const DATASET_ID = process.env.DATASET_ID!
const TABLE_ID = process.env.TABLE_ID!
const VERCEL_LOG_DRAIN_SECRET = process.env.VERCEL_LOG_DRAIN_SECRET!

// Initialize BigQuery service (singleton)
const bigQueryService = new BigQueryService(GCP_PROJECT, DATASET_ID, TABLE_ID)

/**
 * HTTP Cloud Function handler for Vercel log drain webhooks
 *
 * Flow:
 * 1. Verify HMAC-SHA1 signature
 * 2. Parse NDJSON log entries
 * 3. Filter for bot traffic only
 * 4. Stream to BigQuery
 * 5. Always return 200 OK (prevents retry loops)
 */
export const handleVercelLogs: HttpFunction = async (req, res) => {
  try {
    // 1. Get raw body as string (NDJSON format expected)
    const signature = req.headers['x-vercel-signature'] as string | undefined
    let rawBody: string

    // Cloud Functions may parse the body, we need the raw string for NDJSON
    if (typeof req.body === 'string') {
      rawBody = req.body
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8')
    } else if ((req as any).rawBody) {
      // Use rawBody if available (Cloud Functions provides this)
      rawBody = Buffer.isBuffer((req as any).rawBody)
        ? (req as any).rawBody.toString('utf8')
        : (req as any).rawBody
    } else if (req.body && typeof req.body === 'object') {
      // Body was auto-parsed - this shouldn't happen with NDJSON
      // But handle it gracefully
      rawBody = JSON.stringify(req.body)
      console.warn('Body was auto-parsed as object, expected NDJSON string')
    } else {
      rawBody = ''
    }

    // 2. Verify request signature (HMAC-SHA1)
    const isValidSignature = verifySignature(
      rawBody,
      signature,
      VERCEL_LOG_DRAIN_SECRET
    )

    if (!isValidSignature && signature) {
      // Signature present but invalid - log and still return 200
      console.error('Invalid signature detected')
      res.status(200).send('OK')
      return
    }

    // 3. Parse NDJSON log entries (newline-delimited JSON)
    const logLines = rawBody.trim().split('\n')
    const logEntries: VercelLogEntry[] = []

    for (const line of logLines) {
      try {
        if (line.trim()) {
          const entry = JSON.parse(line) as VercelLogEntry
          logEntries.push(entry)
        }
      } catch (parseError) {
        console.error('Failed to parse NDJSON line:', parseError)
        // Continue processing other lines
      }
    }

    console.log(`Received ${logEntries.length} log entries from Vercel`)

    logEntries.forEach(entry => {
      console.dir(entry, { depth: 10 })
    })

    // 4. Filter and transform bot traffic only
    const botLogs = logEntries
      .map(transformLogToBigQuery)
      .filter((log): log is NonNullable<typeof log> => log !== null)

    console.log(`Filtered to ${botLogs.length} bot log(s)`)

    // console.dir(botLogs, { depth: null })

    // 5. Stream to BigQuery
    if (botLogs.length > 0) {
      console.log('🚀 Streaming to BigQuery...')
      await bigQueryService.insertRows(botLogs)
    }

    // 6. Always return 200 OK (prevents Vercel retry loops)
    res.status(200).send('OK')
  } catch (error) {
    // Log error but still return 200 to prevent retry loops
    console.error('Function error:', error)
    res.status(200).send('OK')
  }
}
