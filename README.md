# KOSHK SKATE ERP

نظام ERP متكامل لإدارة محل تأجير الزلاجات — عربي أولاً، RTL أولاً.

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| الواجهة (Frontend) | React + Vite + TypeScript |
| الخادم (Backend) | Node.js + Express + TypeScript |
| قاعدة البيانات | MySQL / MariaDB (InnoDB, utf8mb4) |
| ORM | Drizzle ORM + mysql2 |
| الخط العربي | Cairo (Google Fonts) |
| التحكم بالإصدار | GitHub |

## هيكل المشروع

```
apps/
  web/     ← الواجهة (React + Vite)
  api/     ← الخادم (Express + TypeScript)
docs/      ← التوثيق الكامل
tests/     ← مجموعات الاختبار
scripts/   ← سكريبتات المساعدة
```

## تشغيل المشروع محلياً

### الواجهة

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
# تعمل على: http://localhost:5173
```

### الخادم

```bash
cd apps/api
cp .env.example .env
# عدّل .env بمعلومات قاعدة البيانات
npm install
npm run dev
# يعمل على: http://localhost:3001
# Health check: http://localhost:3001/api/v1/health
```

## التوثيق

- [حالة المشروع](docs/PROJECT_STATE.md)
- [خريطة المشروع](docs/PROJECT_MAP.md)
- [سجل القرارات](docs/decisions/DECISION_LOG.md)
- [قواعد الوكيل](docs/00-governance/AI_AGENT_RULES.md)
- [دليل المراحل](docs/phases/)

## المراحل

| المرحلة | الاسم | الحالة |
|---|---|---|
| 00 | الحوكمة والتوثيق | ✅ مكتملة |
| 01 | البنية الأساسية | 🔄 جارية |
| 02 | المصادقة والصلاحيات | 📋 مخططة |
| 03–18 | الوحدات والميزات | 📋 مخططة |

---

*KOSHK SKATE ERP — جميع الحقوق محفوظة*
