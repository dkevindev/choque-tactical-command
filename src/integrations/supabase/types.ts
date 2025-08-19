export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cautelas_ativas: {
        Row: {
          created_at: string
          data_cautela: string
          id: string
          material_id: string
          observacoes: string | null
          policial_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          data_cautela?: string
          id?: string
          material_id: string
          observacoes?: string | null
          policial_id: string
          quantidade: number
        }
        Update: {
          created_at?: string
          data_cautela?: string
          id?: string
          material_id?: string
          observacoes?: string | null
          policial_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "cautelas_ativas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_belicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cautelas_ativas_policial_id_fkey"
            columns: ["policial_id"]
            isOneToOne: false
            referencedRelation: "policiais"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes_pendentes: {
        Row: {
          created_at: string
          data_confirmacao: string | null
          data_solicitacao: string
          id: string
          materiais: Json
          policial_id: string
          status: string
        }
        Insert: {
          created_at?: string
          data_confirmacao?: string | null
          data_solicitacao?: string
          id?: string
          materiais?: Json
          policial_id: string
          status: string
        }
        Update: {
          created_at?: string
          data_confirmacao?: string | null
          data_solicitacao?: string
          id?: string
          materiais?: Json
          policial_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_pendentes_policial_id_fkey"
            columns: ["policial_id"]
            isOneToOne: false
            referencedRelation: "policiais"
            referencedColumns: ["id"]
          },
        ]
      }
      livro_diario: {
        Row: {
          armeiro_id: string
          created_at: string
          data_abertura: string | null
          data_fechamento: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          armeiro_id: string
          created_at?: string
          data_abertura?: string | null
          data_fechamento?: string | null
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          armeiro_id?: string
          created_at?: string
          data_abertura?: string | null
          data_fechamento?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      materiais_belicos: {
        Row: {
          calibre: string | null
          categoria: string
          created_at: string
          disponivel: boolean
          fabricante: string | null
          id: string
          nome: string
          numero_serie: string | null
          observacoes: string | null
          quantidade_estoque: number
          subcategoria: string | null
          updated_at: string
        }
        Insert: {
          calibre?: string | null
          categoria: string
          created_at?: string
          disponivel?: boolean
          fabricante?: string | null
          id?: string
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          quantidade_estoque?: number
          subcategoria?: string | null
          updated_at?: string
        }
        Update: {
          calibre?: string | null
          categoria?: string
          created_at?: string
          disponivel?: boolean
          fabricante?: string | null
          id?: string
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          quantidade_estoque?: number
          subcategoria?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_belicas: {
        Row: {
          armeiro_responsavel: string
          created_at: string
          id: string
          material_id: string
          observacoes: string | null
          policial_id: string
          quantidade: number
          tipo_movimentacao: string
        }
        Insert: {
          armeiro_responsavel: string
          created_at?: string
          id?: string
          material_id: string
          observacoes?: string | null
          policial_id: string
          quantidade: number
          tipo_movimentacao: string
        }
        Update: {
          armeiro_responsavel?: string
          created_at?: string
          id?: string
          material_id?: string
          observacoes?: string | null
          policial_id?: string
          quantidade?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_belicas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_belicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_belicas_policial_id_fkey"
            columns: ["policial_id"]
            isOneToOne: false
            referencedRelation: "policiais"
            referencedColumns: ["id"]
          },
        ]
      }
      policiais: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          matricula: string
          nome: string
          posto_graduacao: string
          senha: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          matricula: string
          nome: string
          posto_graduacao: string
          senha: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          matricula?: string
          nome?: string
          posto_graduacao?: string
          senha?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservas_ativas: {
        Row: {
          armeiro_id: string
          created_at: string
          id: string
          materiais: Json
          policial_id: string
          sessao_id: string
          status: string
          updated_at: string
        }
        Insert: {
          armeiro_id: string
          created_at?: string
          id?: string
          materiais?: Json
          policial_id: string
          sessao_id: string
          status: string
          updated_at?: string
        }
        Update: {
          armeiro_id?: string
          created_at?: string
          id?: string
          materiais?: Json
          policial_id?: string
          sessao_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_ativas_policial_id_fkey"
            columns: ["policial_id"]
            isOneToOne: false
            referencedRelation: "policiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ativas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_atendimento: {
        Row: {
          armeiro_id: string
          created_at: string
          id: string
          materiais: Json
          policial_id: string
          status: string
          updated_at: string
        }
        Insert: {
          armeiro_id: string
          created_at?: string
          id?: string
          materiais?: Json
          policial_id: string
          status: string
          updated_at?: string
        }
        Update: {
          armeiro_id?: string
          created_at?: string
          id?: string
          materiais?: Json
          policial_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_atendimento_policial_id_fkey"
            columns: ["policial_id"]
            isOneToOne: false
            referencedRelation: "policiais"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
