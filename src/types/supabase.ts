export interface Database {
  public: {
    Tables: {
      screenshots: {
        Row: {
          id: string;
          user_id: string;
          pdf_name: string;
          page_number: number;
          y_position: number;
          image_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pdf_name: string;
          page_number: number;
          y_position: number;
          image_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pdf_name?: string;
          page_number?: number;
          y_position?: number;
          image_url?: string;
          created_at?: string;
        };
      };
    };
  };
} 