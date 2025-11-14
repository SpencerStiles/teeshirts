# Product Ingestion Guide

## Automatic Updates (Weekly)

Your product catalog automatically updates **every Sunday at 2 AM UTC** (8 PM Saturday CST).

You don't need to do anything! The system will:
1. Fetch new products from Spring
2. Update the catalog
3. Push changes to GitHub
4. Deploy automatically to your live site

---

## Manual Updates (If Needed)

If you need to update products outside the weekly schedule:

### Option 1: GitHub Actions (Recommended) ✅

1. Go to your GitHub repository
2. Click the **"Actions"** tab at the top
3. Click **"Product Ingestion"** in the left sidebar
4. Click the **"Run workflow"** button (top right)
5. Click the green **"Run workflow"** button to confirm

The process takes **30-45 minutes**. You can close the page and it will continue running.

### Option 2: Run Locally (Advanced)

If you have the code on your computer:

```bash
npm run ingest:spring
```

This will take 30-45 minutes to complete.

---

## Schedule Options

You can change how often the catalog updates by editing `.github/workflows/ingest.yml`:

**Current:** Every Sunday at 2 AM UTC
```yaml
cron: '0 2 * * 0'
```

**Other options:**
- Daily at 2 AM: `'0 2 * * *'`
- Every Monday & Friday: `'0 2 * * 1,5'`
- Twice a week (Sun & Wed): `'0 2 * * 0,3'`
- Every 3 days: Not supported - use manual triggers instead

---

## Monitoring

To check if the ingestion succeeded:

1. Go to **Actions** tab on GitHub
2. Look at the latest "Product Ingestion" workflow
3. Green checkmark ✅ = Success
4. Red X ❌ = Failed (contact developer)

---

## Troubleshooting

**Q: New products aren't showing up on the site**
- Check Actions tab - did the workflow succeed?
- Wait a few minutes for deployment
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

**Q: The workflow failed**
- Check the logs in the Actions tab
- Contact the developer with the error message

**Q: I need to update immediately**
- Use the "Run workflow" button in GitHub Actions
- Or run `npm run ingest:spring` locally

---

## Need Help?

Contact the developer if:
- The automatic updates stop working
- You need to change the schedule
- Products aren't appearing correctly
