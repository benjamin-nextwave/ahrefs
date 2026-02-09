export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EnrichmentType = 'webshop' | 'bouwbedrijf'

export type Database = {
  public: {
    Tables: {
      scan_jobs: {
        Row: {
          id: string
          name: string
          total_domains: number
          status: 'pending' | 'running' | 'completed' | 'failed'
          enrichment_type: EnrichmentType
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
          enrichment_type?: EnrichmentType
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
          enrichment_type?: EnrichmentType
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
      webshop_metrics: {
        Row: {
          id: string
          domain_id: string
          organic_keywords_current: number | null
          organic_keywords_3m: number | null
          organic_keywords_6m: number | null
          organic_keywords_12m: number | null
          organic_keywords_24m: number | null
          organic_traffic_current: number | null
          organic_traffic_3m: number | null
          organic_traffic_6m: number | null
          organic_traffic_12m: number | null
          organic_traffic_24m: number | null
          paid_keywords_current: number | null
          paid_keywords_3m: number | null
          paid_keywords_6m: number | null
          paid_keywords_12m: number | null
          paid_keywords_24m: number | null
          paid_traffic_current: number | null
          paid_traffic_3m: number | null
          paid_traffic_6m: number | null
          paid_traffic_12m: number | null
          paid_traffic_24m: number | null
          checked_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          organic_keywords_current?: number | null
          organic_keywords_3m?: number | null
          organic_keywords_6m?: number | null
          organic_keywords_12m?: number | null
          organic_keywords_24m?: number | null
          organic_traffic_current?: number | null
          organic_traffic_3m?: number | null
          organic_traffic_6m?: number | null
          organic_traffic_12m?: number | null
          organic_traffic_24m?: number | null
          paid_keywords_current?: number | null
          paid_keywords_3m?: number | null
          paid_keywords_6m?: number | null
          paid_keywords_12m?: number | null
          paid_keywords_24m?: number | null
          paid_traffic_current?: number | null
          paid_traffic_3m?: number | null
          paid_traffic_6m?: number | null
          paid_traffic_12m?: number | null
          paid_traffic_24m?: number | null
          checked_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          organic_keywords_current?: number | null
          organic_keywords_3m?: number | null
          organic_keywords_6m?: number | null
          organic_keywords_12m?: number | null
          organic_keywords_24m?: number | null
          organic_traffic_current?: number | null
          organic_traffic_3m?: number | null
          organic_traffic_6m?: number | null
          organic_traffic_12m?: number | null
          organic_traffic_24m?: number | null
          paid_keywords_current?: number | null
          paid_keywords_3m?: number | null
          paid_keywords_6m?: number | null
          paid_keywords_12m?: number | null
          paid_keywords_24m?: number | null
          paid_traffic_current?: number | null
          paid_traffic_3m?: number | null
          paid_traffic_6m?: number | null
          paid_traffic_12m?: number | null
          paid_traffic_24m?: number | null
          checked_at?: string
        }
      }
      bouwbedrijf_metrics: {
        Row: {
          id: string
          domain_id: string
          top_competitor: string | null
          top_competitor_traffic: number | null
          top_competitor_ads_keywords: number | null
          achievable_traffic: number | null
          content_gap_count: number | null
          content_gap_keywords: Json | null
          checked_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          top_competitor?: string | null
          top_competitor_traffic?: number | null
          top_competitor_ads_keywords?: number | null
          achievable_traffic?: number | null
          content_gap_count?: number | null
          content_gap_keywords?: Json | null
          checked_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          top_competitor?: string | null
          top_competitor_traffic?: number | null
          top_competitor_ads_keywords?: number | null
          achievable_traffic?: number | null
          content_gap_count?: number | null
          content_gap_keywords?: Json | null
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
export type WebshopMetrics = Database['public']['Tables']['webshop_metrics']['Row']
export type BouwbedrijfMetrics = Database['public']['Tables']['bouwbedrijf_metrics']['Row']

export type ScanJobInsert = Database['public']['Tables']['scan_jobs']['Insert']
export type DomainInsert = Database['public']['Tables']['domains']['Insert']
export type DomainMetricsInsert = Database['public']['Tables']['domain_metrics']['Insert']
export type WebshopMetricsInsert = Database['public']['Tables']['webshop_metrics']['Insert']
export type BouwbedrijfMetricsInsert = Database['public']['Tables']['bouwbedrijf_metrics']['Insert']
