/**
 * BigQuery streaming insert service
 */

import { BigQuery } from '@google-cloud/bigquery'
import { BotLogRow } from '../types/bigquery.types'

export class BigQueryService {
  private bigquery: BigQuery
  private datasetId: string
  private tableId: string

  constructor(projectId: string, datasetId: string, tableId: string) {
    // Uses Application Default Credentials (Workload Identity)
    this.bigquery = new BigQuery({ projectId })
    this.datasetId = datasetId
    this.tableId = tableId
  }

  /**
   * Streams bot log rows to BigQuery
   *
   * Uses insert() method which calls tabledata().insertAll() internally
   * Recommended: 500 rows per request (max 10,000)
   *
   * Reference: https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery
   */
  async insertRows(rows: BotLogRow[]): Promise<void> {
    if (rows.length === 0) {
      console.log('No bot traffic to insert')
      return
    }

    try {
      await this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId)
        .insert(rows)

      console.log(`Successfully inserted ${rows.length} bot log(s) to BigQuery`)
    } catch (error) {
      // Log error but don't throw - we return 200 to prevent retry loops
      console.error('BigQuery insert error:', error)

      // Log individual row errors if available
      if (error && typeof error === 'object' && 'errors' in error) {
        const bqError = error as { errors?: unknown[] }
        if (Array.isArray(bqError.errors)) {
          console.error('Row errors:', JSON.stringify(bqError.errors, null, 2))
        }
      }
    }
  }
}
