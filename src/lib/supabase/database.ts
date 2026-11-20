// Generated from the local database. Do not edit manually.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "actor_type": string,"actor_user_id": string | null,"business_id": string,"created_at": string,"entity_id": string,"entity_type": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_type": string,"actor_user_id"?: string | null,"business_id": string,"created_at"?: string,"entity_id": string,"entity_type": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "actor_type"?: string,"actor_user_id"?: string | null,"business_id"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_logs_business_id_actor_user_id_fkey"
      columns: ["business_id","actor_user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    },{
      foreignKeyName: "activity_logs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_conversations": {
                  Row: {
                    "archived_at": string | null,"business_id": string,"created_at": string,"id": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"business_id": string,"created_at"?: string,"id"?: string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"business_id"?: string,"created_at"?: string,"id"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_conversations_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_conversations_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"ai_messages": {
                  Row: {
                    "business_id": string,"content": string,"conversation_id": string,"created_at": string,"id": string,"role": string,"sequence": number,"structured_content": Json | null,"updated_at": string,"usage_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"content": string,"conversation_id": string,"created_at"?: string,"id"?: string,"role": string,"sequence"?: never,"structured_content"?: Json | null,"updated_at"?: string,"usage_id"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"content"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"role"?: string,"sequence"?: never,"structured_content"?: Json | null,"updated_at"?: string,"usage_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_messages_business_id_conversation_id_fkey"
      columns: ["business_id","conversation_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "ai_messages_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_messages_business_id_usage_id_fkey"
      columns: ["business_id","usage_id"]
isOneToOne: false
      referencedRelation: "ai_usage"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"ai_results": {
                  Row: {
                    "business_id": string,"cache_key": string,"content": NonNullable<Json>,"created_at": string,"id": string,"updated_at": string,"usage_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"cache_key": string,"content": NonNullable<Json>,"created_at"?: string,"id"?: string,"updated_at"?: string,"usage_id": string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"cache_key"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"updated_at"?: string,"usage_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_results_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_results_business_id_usage_id_fkey"
      columns: ["business_id","usage_id"]
isOneToOne: false
      referencedRelation: "ai_usage"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "ai_results_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"ai_usage": {
                  Row: {
                    "attempts": number,"business_id": string,"completed_at": string | null,"created_at": string,"error_code": string | null,"estimated_cost_usd": number | null,"id": string,"input_tokens": number | null,"model": string,"output_tokens": number | null,"pricing_version": string | null,"provider": string,"request_id": string,"status": string,"task": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"business_id": string,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"estimated_cost_usd"?: number | null,"id"?: string,"input_tokens"?: number | null,"model": string,"output_tokens"?: number | null,"pricing_version"?: string | null,"provider"?: string,"request_id": string,"status": string,"task": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"business_id"?: string,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"estimated_cost_usd"?: number | null,"id"?: string,"input_tokens"?: number | null,"model"?: string,"output_tokens"?: number | null,"pricing_version"?: string | null,"provider"?: string,"request_id"?: string,"status"?: string,"task"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "assigned_user_id": string,"business_id": string,"created_at": string,"customer_id": string,"ends_at": string,"id": string,"job_id": string | null,"notes": string,"starts_at": string,"status": string,"timezone": string,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_user_id": string,"business_id": string,"created_at"?: string,"customer_id": string,"ends_at": string,"id"?: string,"job_id"?: string | null,"notes"?: string,"starts_at": string,"status"?: string,"timezone": string,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "assigned_user_id"?: string,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"ends_at"?: string,"id"?: string,"job_id"?: string | null,"notes"?: string,"starts_at"?: string,"status"?: string,"timezone"?: string,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_business_id_assigned_user_id_fkey"
      columns: ["business_id","assigned_user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    },{
      foreignKeyName: "appointments_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "appointments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "appointments_job_customer"
      columns: ["business_id","job_id","customer_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id","customer_id"]
    }
                  ]
                },"business_ai_settings": {
                  Row: {
                    "business_id": string,"created_at": string,"daily_limit": number,"default_model_role": string,"enabled": boolean,"monthly_limit": number,"reasoning_enabled": boolean,"updated_at": string,"vision_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"daily_limit"?: number,"default_model_role"?: string,"enabled"?: boolean,"monthly_limit"?: number,"reasoning_enabled"?: boolean,"updated_at"?: string,"vision_enabled"?: boolean
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"daily_limit"?: number,"default_model_role"?: string,"enabled"?: boolean,"monthly_limit"?: number,"reasoning_enabled"?: boolean,"updated_at"?: string,"vision_enabled"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_ai_settings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_chatbot_settings": {
                  Row: {
                    "approved_at": string | null,"approved_business_info": string,"business_hours": string,"business_id": string,"created_at": string,"enabled": boolean,"fallback_message": string,"pricing_policy": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_business_info"?: string,"business_hours"?: string,"business_id": string,"created_at"?: string,"enabled"?: boolean,"fallback_message"?: string,"pricing_policy"?: string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_business_info"?: string,"business_hours"?: string,"business_id"?: string,"created_at"?: string,"enabled"?: boolean,"fallback_message"?: string,"pricing_policy"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_chatbot_settings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_faqs": {
                  Row: {
                    "answer": string,"business_id": string,"created_at": string,"id": string,"position": number,"published": boolean,"question": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"business_id": string,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"question": string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"business_id"?: string,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"question"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_faqs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_memberships": {
                  Row: {
                    "business_id": string,"created_at": string,"role": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"role": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"role"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_memberships_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"business_pricing_rules": {
                  Row: {
                    "business_id": string,"created_at": string,"enabled": boolean,"id": string,"service_id": string,"unit": string,"unit_price": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"enabled"?: boolean,"id"?: string,"service_id": string,"unit": string,"unit_price": number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"enabled"?: boolean,"id"?: string,"service_id"?: string,"unit"?: string,"unit_price"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_pricing_rules_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_pricing_rules_business_id_service_id_fkey"
      columns: ["business_id","service_id"]
isOneToOne: false
      referencedRelation: "business_services"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"business_services": {
                  Row: {
                    "business_id": string,"created_at": string,"description": string,"enabled": boolean,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"description"?: string,"enabled"?: boolean,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"description"?: string,"enabled"?: boolean,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_services_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_subscriptions": {
                  Row: {
                    "business_id": string,"created_at": string,"plan_id": string,"status": string,"trial_ends_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"plan_id": string,"status": string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"plan_id"?: string,"status"?: string,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_subscriptions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "subscription_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "address": string,"created_at": string,"currency": string,"default_terms": string,"description": string,"email": string,"id": string,"is_demo": boolean,"logo_path": string | null,"name": string,"phone": string,"service_areas": (string)[],"slug": string,"tax_number": string | null,"tax_rate": number,"tax_registered": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"currency": string,"default_terms"?: string,"description"?: string,"email": string,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name": string,"phone": string,"service_areas"?: (string)[],"slug": string,"tax_number"?: string | null,"tax_rate"?: number,"tax_registered"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"currency"?: string,"default_terms"?: string,"description"?: string,"email"?: string,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name"?: string,"phone"?: string,"service_areas"?: (string)[],"slug"?: string,"tax_number"?: string | null,"tax_rate"?: number,"tax_registered"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customer_addresses": {
                  Row: {
                    "address": string,"business_id": string,"created_at": string,"customer_id": string,"id": string,"label": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"business_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"label"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"label"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_addresses_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "customer_addresses_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "archived_at": string | null,"business_id": string,"created_at": string,"email": string | null,"full_name": string,"id": string,"internal_notes": string,"phone": string | null,"search_document": unknown,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"business_id": string,"created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"internal_notes"?: string,"phone"?: string | null,"search_document"?: never,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"business_id"?: string,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"internal_notes"?: string,"phone"?: string | null,"search_document"?: never,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"email_logs": {
                  Row: {
                    "attempt_at": string | null,"attempts": number,"business_id": string,"confirmed_at": string | null,"created_at": string,"created_by": string | null,"customer_id": string | null,"delivered_at": string | null,"failure_code": string | null,"id": string,"idempotency_key": string,"job_id": string | null,"payload": Json | null,"provider_event_at": string | null,"provider_id": string | null,"quotation_id": string | null,"recipient": string,"status": string,"subject": string,"submitted_at": string | null,"template": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_at"?: string | null,"attempts"?: number,"business_id": string,"confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"delivered_at"?: string | null,"failure_code"?: string | null,"id"?: string,"idempotency_key"?: string,"job_id"?: string | null,"payload"?: Json | null,"provider_event_at"?: string | null,"provider_id"?: string | null,"quotation_id"?: string | null,"recipient": string,"status"?: string,"subject": string,"submitted_at"?: string | null,"template": string,"updated_at"?: string
                  }
                  Update: {
                    "attempt_at"?: string | null,"attempts"?: number,"business_id"?: string,"confirmed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"delivered_at"?: string | null,"failure_code"?: string | null,"id"?: string,"idempotency_key"?: string,"job_id"?: string | null,"payload"?: Json | null,"provider_event_at"?: string | null,"provider_id"?: string | null,"quotation_id"?: string | null,"recipient"?: string,"status"?: string,"subject"?: string,"submitted_at"?: string | null,"template"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_actor_tenant"
      columns: ["business_id","created_by"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    },{
      foreignKeyName: "email_logs_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "email_logs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_logs_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "email_logs_business_id_quotation_id_fkey"
      columns: ["business_id","quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "email_logs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"job_assignments": {
                  Row: {
                    "business_id": string,"created_at": string,"job_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"job_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"job_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_assignments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_assignments_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "job_assignments_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "budget": number,"business_id": string,"completed_at": string | null,"created_at": string,"currency": string,"customer_id": string,"description": string,"ends_at": string,"id": string,"internal_notes": string,"property_address": string,"quotation_id": string | null,"starts_at": string,"status": string,"timezone": string,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "budget": number,"business_id": string,"completed_at"?: string | null,"created_at"?: string,"currency": string,"customer_id": string,"description"?: string,"ends_at": string,"id"?: string,"internal_notes"?: string,"property_address": string,"quotation_id"?: string | null,"starts_at": string,"status"?: string,"timezone"?: string,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "budget"?: number,"business_id"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string,"description"?: string,"ends_at"?: string,"id"?: string,"internal_notes"?: string,"property_address"?: string,"quotation_id"?: string | null,"starts_at"?: string,"status"?: string,"timezone"?: string,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "jobs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_business_id_quotation_id_fkey"
      columns: ["business_id","quotation_id"]
isOneToOne: true
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "jobs_quotation_customer"
      columns: ["business_id","quotation_id","customer_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id","customer_id"]
    }
                  ]
                },"lead_photos": {
                  Row: {
                    "ai_consent_at": string | null,"ai_consent_version": string | null,"business_id": string,"byte_size": number,"created_at": string,"id": string,"lead_id": string,"mime_type": string,"storage_path": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_consent_at"?: string | null,"ai_consent_version"?: string | null,"business_id": string,"byte_size": number,"created_at"?: string,"id"?: string,"lead_id": string,"mime_type": string,"storage_path": string,"updated_at"?: string
                  }
                  Update: {
                    "ai_consent_at"?: string | null,"ai_consent_version"?: string | null,"business_id"?: string,"byte_size"?: number,"created_at"?: string,"id"?: string,"lead_id"?: string,"mime_type"?: string,"storage_path"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_photos_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_photos_business_id_lead_id_fkey"
      columns: ["business_id","lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "additional_information": string,"archived_at": string | null,"business_id": string,"created_at": string,"customer_id": string,"id": string,"internal_notes": string,"painting_areas": (string)[],"preferred_start_date": string | null,"property_address": string,"property_type": string,"room_count": number | null,"room_measurements": NonNullable<Json>,"search_document": unknown,"source": string,"status": string,"updated_at": string,"wall_condition": string,"work_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_information"?: string,"archived_at"?: string | null,"business_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"internal_notes"?: string,"painting_areas"?: (string)[],"preferred_start_date"?: string | null,"property_address": string,"property_type": string,"room_count"?: number | null,"room_measurements"?: NonNullable<Json>,"search_document"?: never,"source"?: string,"status"?: string,"updated_at"?: string,"wall_condition"?: string,"work_type": string
                  }
                  Update: {
                    "additional_information"?: string,"archived_at"?: string | null,"business_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"internal_notes"?: string,"painting_areas"?: (string)[],"preferred_start_date"?: string | null,"property_address"?: string,"property_type"?: string,"room_count"?: number | null,"room_measurements"?: NonNullable<Json>,"search_document"?: never,"source"?: string,"status"?: string,"updated_at"?: string,"wall_condition"?: string,"work_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "leads_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "business_id": string,"created_at": string,"email_notifications": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"email_notifications"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"email_notifications"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: true
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "business_id": string,"created_at": string,"destination_path": string | null,"event_type": string,"id": string,"message": string,"read_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"destination_path"?: string | null,"event_type": string,"id"?: string,"message": string,"read_at"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"destination_path"?: string | null,"event_type"?: string,"id"?: string,"message"?: string,"read_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    }
                  ]
                },"plan_change_requests": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"plan_id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"plan_id": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"plan_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_change_requests_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_change_requests_business_id_user_id_fkey"
      columns: ["business_id","user_id"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    },{
      foreignKeyName: "plan_change_requests_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "subscription_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quotation_access_tokens": {
                  Row: {
                    "business_id": string,"created_at": string,"expires_at": string,"id": string,"quotation_id": string,"revoked_at": string | null,"token_hash": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"expires_at": string,"id"?: string,"quotation_id": string,"revoked_at"?: string | null,"token_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"quotation_id"?: string,"revoked_at"?: string | null,"token_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_access_tokens_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_access_tokens_business_id_quotation_id_fkey"
      columns: ["business_id","quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quotation_items": {
                  Row: {
                    "business_id": string,"created_at": string,"description": string,"id": string,"line_total": number,"position": number,"quantity": number,"quotation_id": string,"service_id": string | null,"unit": string,"unit_price": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"description": string,"id"?: string,"line_total": number,"position": number,"quantity": number,"quotation_id": string,"service_id"?: string | null,"unit": string,"unit_price": number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"line_total"?: number,"position"?: number,"quantity"?: number,"quotation_id"?: string,"service_id"?: string | null,"unit"?: string,"unit_price"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_items_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_items_business_id_quotation_id_fkey"
      columns: ["business_id","quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "quotation_items_business_id_service_id_fkey"
      columns: ["business_id","service_id"]
isOneToOne: false
      referencedRelation: "business_services"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quotation_messages": {
                  Row: {
                    "body": string,"business_id": string,"created_at": string,"id": string,"quotation_id": string,"request_id": string,"sender_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"business_id": string,"created_at"?: string,"id"?: string,"quotation_id": string,"request_id": string,"sender_type": string
                  }
                  Update: {
                    "body"?: string,"business_id"?: string,"created_at"?: string,"id"?: string,"quotation_id"?: string,"request_id"?: string,"sender_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_messages_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_messages_business_id_quotation_id_fkey"
      columns: ["business_id","quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quotations": {
                  Row: {
                    "additional_charges": number,"approved_at": string | null,"approved_by": string | null,"business_id": string,"created_at": string,"currency": string,"customer_id": string,"customer_notes": string,"customer_snapshot": NonNullable<Json>,"decided_at": string | null,"discount_amount": number,"expires_on": string,"id": string,"internal_notes": string,"issued_on": string,"lead_id": string | null,"pdf_path": string | null,"reference": string,"sender_snapshot": NonNullable<Json>,"sent_at": string | null,"status": string,"subtotal": number,"tax_amount": number,"tax_rate": number,"terms": string,"total": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_charges"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"business_id": string,"created_at"?: string,"currency": string,"customer_id": string,"customer_notes"?: string,"customer_snapshot": NonNullable<Json>,"decided_at"?: string | null,"discount_amount"?: number,"expires_on": string,"id"?: string,"internal_notes"?: string,"issued_on"?: string,"lead_id"?: string | null,"pdf_path"?: string | null,"reference": string,"sender_snapshot": NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"subtotal": number,"tax_amount": number,"tax_rate"?: number,"terms"?: string,"total": number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "additional_charges"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"business_id"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string,"customer_notes"?: string,"customer_snapshot"?: NonNullable<Json>,"decided_at"?: string | null,"discount_amount"?: number,"expires_on"?: string,"id"?: string,"internal_notes"?: string,"issued_on"?: string,"lead_id"?: string | null,"pdf_path"?: string | null,"reference"?: string,"sender_snapshot"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"subtotal"?: number,"tax_amount"?: number,"tax_rate"?: number,"terms"?: string,"total"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_business_id_approved_by_fkey"
      columns: ["business_id","approved_by"]
isOneToOne: false
      referencedRelation: "business_memberships"
      referencedColumns: ["business_id","user_id"]
    },{
      foreignKeyName: "quotations_business_id_customer_id_fkey"
      columns: ["business_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "quotations_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_business_id_lead_id_fkey"
      columns: ["business_id","lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "quotations_lead_customer"
      columns: ["business_id","lead_id","customer_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["business_id","id","customer_id"]
    }
                  ]
                },"subscription_plans": {
                  Row: {
                    "ai_tasks": (string)[],"daily_ai": number,"id": string,"monthly_ai": number,"monthly_quotes": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_tasks": (string)[],"daily_ai": number,"id": string,"monthly_ai": number,"monthly_quotes": number,"name": string
                  }
                  Update: {
                    "ai_tasks"?: (string)[],"daily_ai"?: number,"id"?: string,"monthly_ai"?: number,"monthly_quotes"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ai_business_metrics":
{ Args: { "target_business": string }; Returns: Json
                           },
"claim_email_send":
{ Args: { "actor": string,"confirmed": boolean,"email": string,"target_business": string }; Returns: {
              "attempt_at": string | null,
"attempts": number,
"business_id": string,
"confirmed_at": string | null,
"created_at": string,
"created_by": string | null,
"customer_id": string | null,
"delivered_at": string | null,
"failure_code": string | null,
"id": string,
"idempotency_key": string,
"job_id": string | null,
"payload": Json | null,
"provider_event_at": string | null,
"provider_id": string | null,
"quotation_id": string | null,
"recipient": string,
"status": string,
"subject": string,
"submitted_at": string | null,
"template": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "email_logs"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_ai_request":
{ Args: { "actor": string,"fingerprint": string,"output": Json,"target_business": string,"usage": string }; Returns: string
                           },
"complete_public_request":
{ Args: { "details": Json,"new_lead": string,"photos": Json,"request_nonce": string,"target_business": string }; Returns: undefined
                           },
"create_email_draft":
{ Args: { "actor": string,"customer": string,"envelope": Json,"job": string,"kind": string,"quotation": string,"target_business": string }; Returns: string
                           },
"create_notification_email":
{ Args: { "actor": string,"envelope": Json,"notification": string,"target_business": string }; Returns: string
                           },
"dashboard_metrics":
{ Args: { "target_business": string }; Returns: Json
                           },
"onboard_business":
{ Args: { "details": Json,"services": Json }; Returns: string
                           },
"portal_quotation":
{ Args: { "access_digest": string }; Returns: Json
                           },
"preview_quotation":
{ Args: { "details": Json,"target_business": string }; Returns: Json
                           },
"public_request_state":
{ Args: { "mark_failed"?: boolean,"request_nonce": string,"target_business": string }; Returns: string
                           },
"publish_quotation":
{ Args: { "access_digest": string,"expected_version": number,"pdf_object": string,"quotation": string,"target_business": string }; Returns: undefined
                           },
"record_email_event":
{ Args: { "event_status": string,"event_time": string,"provider": string }; Returns: boolean
                           },
"request_plan_change":
{ Args: { "confirmed": boolean,"requested_plan": string,"target_business": string }; Returns: undefined
                           },
"reserve_ai_request":
{ Args: { "actor": string,"model_name": string,"reasoning"?: boolean,"request": string,"target_business": string,"task_name": string }; Returns: string
                           },
"reserve_chat_request":
{ Args: { "client_digest": string,"model_name": string,"request": string,"target_business": string }; Returns: string
                           },
"reserve_public_request":
{ Args: { "client_digest": string,"email_digest": string,"request_nonce": string,"target_business": string }; Returns: string
                           },
"respond_to_quotation":
{ Args: { "access_digest": string,"decision": string,"message": string,"message_request": string }; Returns: string
                           },
"save_ai_exchange":
{ Args: { "question": string,"result": string,"target_business": string,"target_conversation": string }; Returns: string
                           },
"save_ai_settings":
{ Args: { "settings": Json,"target_business": string }; Returns: undefined
                           },
"save_appointment":
{ Args: { "appointment": string,"details": Json,"expected_version": number,"target_business": string }; Returns: string
                           },
"save_business_settings":
{ Args: { "currency_confirmed": boolean,"details": Json,"target_business": string }; Returns: undefined
                           },
"save_chatbot_settings":
{ Args: { "confirmed": boolean,"faqs": Json,"settings": Json,"target_business": string }; Returns: undefined
                           },
"save_customer":
{ Args: { "customer": string,"details": Json,"target_business": string }; Returns: string
                           },
"save_job":
{ Args: { "details": Json,"expected_version": number,"job": string,"target_business": string }; Returns: string
                           },
"save_lead":
{ Args: { "details": Json,"lead": string,"target_business": string }; Returns: string
                           },
"save_quotation":
{ Args: { "details": Json,"expected_version": number,"quotation": string,"target_business": string }; Returns: string
                           },
"save_service_pricing":
{ Args: { "details": Json,"pricing": string,"service": string,"target_business": string }; Returns: string
                           },
"set_crm_archived":
{ Args: { "archived": boolean,"record_id": string,"record_kind": string,"target_business": string }; Returns: undefined
                           },
"subscription_summary":
{ Args: { "target_business": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
