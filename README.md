# OSS Frontend Render v2

Improved pages:
- Services: left list, read-only details, edit/new/delete
- Order Aims: left list, editor with sub-aims
- Attributes: left list, editor with possible values and list support

## Local
npm install
copy .env.example .env
npm run dev

## Render Static Site
Build Command:
npm install && npm run build

Publish Directory:
dist

Environment Variable:
VITE_API_BASE=https://YOUR-BACKEND.onrender.com/api
