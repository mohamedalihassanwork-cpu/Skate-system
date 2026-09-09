# KOSHK SKATE ERP

نظام ERP متكامل لإدارة محل تأجير الزلاجات — عربي أولاً، RTL أولاً.

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| الواجهة (Frontend) | React + Vite + TypeScript + React Router |
| الخادم (Backend) | Node.js + Express + TypeScript |
| قاعدة البيانات | MySQL / MariaDB (InnoDB, utf8mb4) |
| ORM | Drizzle ORM + mysql2 |
| المصادقة | JWT + Refresh Token (HttpOnly Cookie) |
| RBAC | أدوار وصلاحيات مخزنة في قاعدة البيانات |
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

### المتطلبات الأساسية
- Node.js >= 18
- MySQL / MariaDB مع قاعدة بيانات باسم `koshk_skate`

### الخادم (Backend)

```bash
cd apps/api
cp .env.example .env
# عدّل .env بمعلومات قاعدة البيانات وأسرار JWT
npm install
npm run db:migrate   # تطبيق الترحيل على قاعدة البيانات
npm run db:seed      # بذر البيانات الأساسية (أدوار + صلاحيات + مدير النظام)
npm run dev
# يعمل على: http://localhost:3001
# Health check: http://localhost:3001/api/v1/health
# تسجيل الدخول: POST http://localhost:3001/api/v1/auth/login
```

### الواجهة (Frontend)

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
# تعمل على: http://localhost:5173
# ستُوجَّه تلقائياً إلى /login
```

### بيانات الدخول الافتراضية (بعد تشغيل db:seed)

| الحقل | القيمة |
|---|---|
| البريد الإلكتروني | admin@koshkskate.com |
| كلمة المرور | Koshk@12345 |

> ⚠️ **يجب تغيير كلمة المرور فور تسجيل الدخول لأول مرة.**

## متغيرات البيئة الهامة (apps/api/.env)

| المتغير | الوصف |
|---|---|
| `DB_PASSWORD` | كلمة مرور MySQL |
| `JWT_SECRET` | سر JWT لرموز الوصول (min 32 حرف) |
| `JWT_REFRESH_SECRET` | سر JWT لرموز التحديث (مختلف عن JWT_SECRET) |
| `SEED_ADMIN_EMAIL` | بريد المدير الافتراضي |
| `SEED_ADMIN_PASSWORD` | كلمة مرور المدير الافتراضية |

## التوثيق

- [حالة المشروع](docs/PROJECT_STATE.md)
- [خريطة المشروع](docs/PROJECT_MAP.md)
- [سجل القرارات](docs/decisions/DECISION_LOG.md)
- [وثائق الأمان](docs/architecture/SECURITY_ARCHITECTURE.md)
- [وحدة المصادقة](docs/modules/AUTH.md)
- [المستخدمون والصلاحيات](docs/modules/USERS_PERMISSIONS.md)
- [قواعد الوكيل](docs/00-governance/AI_AGENT_RULES.md)

## المراحل

| المرحلة | الاسم | الحالة |
|---|---|---|
| 00 | الحوكمة والتوثيق | ✅ مكتملة |
| 01 | البنية الأساسية | ✅ مكتملة |
| 02 | المصادقة والصلاحيات | ✅ مكتملة |
| 03 | وحدة الزلاجات | 📋 مخططة |
| 04 | وحدة العملاء | 📋 مخططة |
| 05 | نقطة بيع الإيجار | 📋 مخططة |
| 06–18 | الوحدات المتبقية | 📋 مخططة |

---

*KOSHK SKATE ERP — جميع الحقوق محفوظة*
