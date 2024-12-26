/*
  # Create screenshots storage schema
  
  1. New Tables
    - `screenshots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `pdf_name` (text)
      - `page_number` (integer)
      - `y_position` (integer)
      - `image_url` (text)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their screenshots
*/

CREATE TABLE screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  pdf_name text NOT NULL,
  page_number integer NOT NULL,
  y_position integer NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own screenshots"
  ON screenshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own screenshots"
  ON screenshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX screenshots_user_pdf_idx ON screenshots(user_id, pdf_name);
CREATE INDEX screenshots_position_idx ON screenshots(page_number, y_position);