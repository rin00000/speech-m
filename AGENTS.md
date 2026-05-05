# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.
# Project: Speech-M (Announcer Academy Platform)

## 1. Business Context
- **Client:** 'Speech-M' Academy.
- **Primary Persona:** Academy Director (Admin) - Focuses on managing data, filtering scraped jobs, and executing automations.
- **Secondary Persona:** Announcer Candidates (Students)
- **Core Value:** Automate manual, repetitive tasks for the academy (job scraping, content formatting, blog posting) to save time and provide curated information to students.

## 2. Domain Knowledge & Logic
- **Key Modules:**
  1. **Job Collector (Crawling):** Scrape job postings from MediaJob, Arang Cafe, and custom URLs provided by the Director.
  2. **Naver Blog Auto-Poster:** Provide a 1-click feature for the Director to publish approved job postings to a Naver Blog using pre-defined templates.
  3. **Exam Review Vault:** A centralized, secure database for highly sensitive exam experiences and interview questions.

## 3. Agent Guidelines & Constraints
- **UI/UX:** The primary interface is an **Admin Dashboard**. It must be clean, data-dense but readable, and highly efficient. Use `Hugeicons` to maintain a professional, premium vibe.
- **Architecture Warning (Crawling):** Be highly aware of Vercel/Serverless timeout limits (15-60s). Design crawling logic to be asynchronous, or suggest background job patterns if necessary.
- **Security & DB (Supabase):** - Job Postings = Publicly readable.
  - Exam Reviews & Student Data = Strictly Private (Require robust Row Level Security - RLS).
- **Git Workflow:** Use English tags for Conventional Commits, but write the descriptions in Korean. (e.g., `feat: 미디어잡 크롤러 로직 추가`, `fix: 대시보드 UI 깨짐 현상 수정`).