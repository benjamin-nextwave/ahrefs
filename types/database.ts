export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      scan_jobs: {
        Row: {
          id: string
          name: string
          total_domains: number
          status: 'pending' | 'running' | 'completed' | 'failed'
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          total_domains: number
          status?: 'pending' | 'running' | 'completed' | 'failed'
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          total_domains?: number
          status?: 'pending' | 'running' | 'completed' | 'failed'
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      domains: {
        Row: {
          id: string
          job_id: string
          domain: string
          scheduled_date: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count: number
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          domain: string
          scheduled_date: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          domain?: string
          scheduled_date?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          retry_count?: number
          error_message?: string | null
          created_at?: string
        }
      }
      domain_metrics: {
        Row: {
          id: string
          domain_id: string
          dr: number | null
          traffic: number | null
          refdomains: number | null
          backlinks: number | null
          keywords: number | null
          checked_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          dr?: number | null
          traffic?: number | null
          refdomains?: number | null
          backlinks?: number | null
          keywords?: number | null
          checked_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          dr?: number | null
          traffic?: number | null
          refdomains?: number | null
          backlinks?: number | null
          keywords?: number | null
          checked_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type ScanJob = Database['public']['Tables']['scan_jobs']['Row']
export type Domain = Database['public']['Tables']['domains']['Row']
export type DomainMetrics = Database['public']['Tables']['domain_metrics']['Row']

export type ScanJobInsert = Database['public']['Tables']['scan_jobs']['Insert']
export type DomainInsert = Database['public']['Tables']['domains']['Insert']
export type DomainMetricsInsert = Database['public']['Tables']['domain_metrics']['Insert']
