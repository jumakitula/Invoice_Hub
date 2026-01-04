export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string | null
          total_amount: number | null
          status: string
          created_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id?: string | null
          total_amount?: number | null
          status?: string
          created_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string | null
          total_amount?: number | null
          status?: string
          created_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          supplier_id: string | null
          po_id: string | null
          invoice_date: string | null
          due_date: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          currency: string
          status: string
          file_path: string | null
          file_type: string | null
          ocr_processed: boolean
          has_validation_issues: boolean
          is_duplicate: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          supplier_id?: string | null
          po_id?: string | null
          invoice_date?: string | null
          due_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          currency?: string
          status?: string
          file_path?: string | null
          file_type?: string | null
          ocr_processed?: boolean
          has_validation_issues?: boolean
          is_duplicate?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          supplier_id?: string | null
          po_id?: string | null
          invoice_date?: string | null
          due_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          currency?: string
          status?: string
          file_path?: string | null
          file_type?: string | null
          ocr_processed?: boolean
          has_validation_issues?: boolean
          is_duplicate?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string | null
          description: string | null
          quantity: number | null
          unit_price: number | null
          line_total: number | null
          tax_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          description?: string | null
          quantity?: number | null
          unit_price?: number | null
          line_total?: number | null
          tax_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          description?: string | null
          quantity?: number | null
          unit_price?: number | null
          line_total?: number | null
          tax_rate?: number | null
          created_at?: string
        }
      }
      invoice_validations: {
        Row: {
          id: string
          invoice_id: string | null
          validation_type: string
          severity: string
          message: string | null
          field_name: string | null
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          validation_type: string
          severity?: string
          message?: string | null
          field_name?: string | null
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          validation_type?: string
          severity?: string
          message?: string | null
          field_name?: string | null
          resolved?: boolean
          created_at?: string
        }
      }
      invoice_approvals: {
        Row: {
          id: string
          invoice_id: string | null
          status: string
          approver_email: string | null
          approved_at: string | null
          comments: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          status?: string
          approver_email?: string | null
          approved_at?: string | null
          comments?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          status?: string
          approver_email?: string | null
          approved_at?: string | null
          comments?: string | null
          created_at?: string
        }
      }
    }
  }
}
