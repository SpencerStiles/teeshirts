import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';

// For Vercel Cron: runs on a schedule automatically
// Add to vercel.json: { "crons": [{ "path": "/api/cron/ingest", "schedule": "0 2 * * *" }] }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Start the ingestion (this will still have time limits on serverless)
  exec('npm run ingest:spring', { cwd: process.cwd() });
  
  return res.status(200).json({ 
    message: 'Ingestion triggered',
    timestamp: new Date().toISOString() 
  });
}
