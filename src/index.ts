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
    // 1. Get raw body (handle both string and parsed object)
    const signature = req.headers['x-vercel-signature'] as string | undefined
    let rawBody: string

    // If body-parser failed and gave us an object, or if it's already a string
    if (typeof req.body === 'string') {
      rawBody = req.body
    } else if (req.body && typeof req.body === 'object') {
      // Body was parsed as JSON (single log entry)
      rawBody = JSON.stringify(req.body)
    } else {
      // Empty body
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

    // 3. Parse NDJSON log entries
    const logLines = rawBody.trim().split('\n')
    const logEntries: VercelLogEntry[] = []

    for (const line of logLines) {
      try {
        if (line.trim()) {
          const entry = JSON.parse(line) as VercelLogEntry
          logEntries.push(entry)
        }
      } catch (parseError) {
        console.error('Failed to parse log line:', parseError)
        // Continue processing other lines
      }
    }

    // logEntries.forEach(log => console.dir(log, { depth: 10 }))

    console.log(`Received ${logEntries.length} log entries from Vercel`)

    // 4. Filter and transform bot traffic only
    const botLogs = logEntries
      .map(transformLogToBigQuery)
      .filter((log): log is NonNullable<typeof log> => log !== null)

    console.log(`Filtered to ${botLogs.length} bot log(s)`)

    // console.dir(botLogs, { depth: null })

    // 5. Stream to BigQuery
    if (botLogs.length > 0) {
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
