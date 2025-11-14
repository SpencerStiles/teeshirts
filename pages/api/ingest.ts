import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Simple password protection - you should change this!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sgmsays2025';

type IngestResponse = {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IngestResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check password
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }

  try {
    // Run the ingestion script in the background
    // Note: This will run async and return immediately
    const command = 'npm run ingest:spring';
    
    // Start the process but don't wait for it
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error('Ingestion error:', error);
      } else {
        console.log('Ingestion completed successfully');
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Product ingestion started! This will take 30-45 minutes. The catalog will update automatically when complete.',
    });
  } catch (error) {
    console.error('Failed to start ingestion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start ingestion',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
