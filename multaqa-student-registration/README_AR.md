# موقع تسجيل الطلاب — مؤسسة ملتقى العلم والدين

موقع عربي بسيط ومتجاوب مع الهاتف، مبني باستخدام Next.js وSupabase، ومهيأ للنشر على Vercel.

## ما الذي يتضمنه؟

- صفحة عامة لتسجيل الطالب: الاسم، المدرسة، الصف، الشعبة، الهاتف، واسم المؤسسة.
- صفحة دخول الإدارة على `/admin` باسم مستخدم وكلمة مرور.
- لوحة تعرض جميع السجلات مع البحث.
- تعديل بيانات الطالب وحذف السجل.
- تصدير النتائج الظاهرة إلى ملف Excel بصيغة XLSX.
- إنشاء تقرير PDF من نافذة الطباعة: اختر «حفظ كملف PDF».
- قواعد RLS تمنع الزوار من قراءة سجلات الطلاب؛ الإضافة العامة فقط مسموحة، أما القراءة والتعديل والحذف فمقصورة على الحساب الإداري المسجل في قاعدة البيانات.

---

## 1) إنشاء قاعدة البيانات في Supabase

1. افتح [Supabase](https://supabase.com/) وأنشئ مشروعًا جديدًا.
2. انتظر اكتمال إعداد قاعدة البيانات.
3. افتح **SQL Editor** ثم اختر **New query**.
4. افتح الملف `supabase/schema.sql` وانسخ محتواه كاملًا إلى SQL Editor.
5. اضغط **Run** وانتظر رسالة نجاح التنفيذ.

هذا ينشئ جدولي `students` و`admin_users`، ويضبط صلاحيات القراءة والكتابة باستخدام Row Level Security.

## 2) إنشاء حساب الإدارة

1. من لوحة Supabase افتح **Authentication → Users**.
2. اختر **Add user** ثم أنشئ مستخدمًا ببريد إلكتروني تملكه أنت وكلمة مرور قوية.
3. أكمل تأكيد البريد للمستخدم من لوحة Supabase إذا تطلب الإعداد ذلك.
4. انسخ البريد الإلكتروني الذي استخدمته؛ ستحتاجه في إعدادات الموقع، لكنه ليس اسم المستخدم الذي سيكتبه المدير في صفحة الدخول.
5. ارجع إلى **SQL Editor** ونفّذ الاستعلام التالي بعد استبدال البريد التجريبي ببريد حساب الإدارة نفسه:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'your-admin-email@example.com'
on conflict (user_id) do nothing;
```

استبدل `your-admin-email@example.com` بالبريد الحقيقي بين علامتي الاقتباس. يجب أن يظهر صف واحد في `admin_users` عند نجاح العملية. لا تنشئ صفحة تسجيل حسابات للمدراء ولا تمنح أي مستخدم عادي صلاحية إضافة نفسه إلى هذا الجدول.

## 3) الحصول على مفاتيح Supabase

من مشروع Supabase افتح **Project Settings → API Keys** أو زر **Connect**:

- انسخ **Project URL**.
- انسخ **Publishable key**.

استخدم مفتاح Publishable فقط في متغير `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. لا تضع `service_role` أو أي Secret key في المتصفح أو في متغير يبدأ بـ `NEXT_PUBLIC_`.

## 4) إعداد المشروع محليًا

1. فك ضغط المشروع.
2. افتح مجلد `multaqa-student-registration` في VS Code أو محرر مشابه.
3. انسخ `.env.example` وسمّ النسخة `.env.local`.
4. املأ القيم في `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
NEXT_PUBLIC_ADMIN_USERNAME=Multaqa0987654321
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@example.com
```

- `NEXT_PUBLIC_ADMIN_USERNAME`: اسم المستخدم الذي سيكتبه المدير. القيمة المبدئية المطلوبة هي `Multaqa0987654321`.
- `NEXT_PUBLIC_ADMIN_EMAIL`: بريد مستخدم Supabase الذي أنشأته في الخطوة 2.
- كلمة المرور لا تُكتب في ملف البيئة؛ المدير يدخلها في صفحة `/admin` وتتحقق منها خدمة Supabase Auth.

5. افتح الطرفية داخل المجلد وشغّل:

```bash
npm install
npm run dev
```

6. افتح `http://localhost:3000` لتجربة نموذج التسجيل، و`http://localhost:3000/admin` لتجربة دخول الإدارة.

## 5) رفع المشروع إلى GitHub

الطريقة الأسهل للنشر عبر Vercel هي ربط مستودع Git:

1. أنشئ مستودعًا جديدًا في GitHub.
2. ارفع محتويات مجلد المشروع إلى المستودع، وليس ملف ZIP نفسه.
3. تأكد أن `.env.local` لم يُرفع؛ فهو مستثنى في `.gitignore`.

يمكنك استخدام GitHub Desktop أو أوامر Git إذا كانت مثبتة لديك.

## 6) النشر على Vercel

1. افتح [Vercel](https://vercel.com/) وسجّل الدخول.
2. اختر **Add New → Project**.
3. استورد مستودع GitHub الذي رفعت إليه المشروع.
4. سيكتشف Vercel أنه مشروع Next.js تلقائيًا.
5. قبل الضغط على Deploy، أضف متغيرات البيئة التالية في إعدادات المشروع:

| المتغير | القيمة |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | مفتاح Publishable |
| `NEXT_PUBLIC_ADMIN_USERNAME` | `Multaqa0987654321` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | بريد حساب الإدارة في Supabase |

أضف المتغيرات لبيئة **Production**، ويمكن إضافتها إلى **Preview** أيضًا عند الحاجة. لا تضف كلمة مرور الإدارة ولا مفتاح `service_role`.

6. اضغط **Deploy**.
7. بعد نجاح النشر افتح رابط Vercel الذي يظهر لك واختبر صفحة التسجيل وصفحة `/admin`.
8. إذا أضفت أو عدّلت متغيرات البيئة بعد النشر، أعد نشر المشروع حتى تُطبّق القيم الجديدة.

## 7) إعداد عنوان الموقع في Supabase

من Supabase افتح **Authentication → URL Configuration**، وضع رابط موقعك النهائي في **Site URL**، مثل:

```text
https://your-project.vercel.app
```

أضف عنوان موقعك المحلي أيضًا إلى Redirect URLs عند الحاجة أثناء التطوير:

```text
http://localhost:3000/**
```

بعد اختيار اسم نطاق Vercel النهائي أو ربط نطاق خاص، حدّث Site URL ليطابق النطاق الفعلي.

## 8) اختبار التشغيل قبل مشاركة الرابط

- سجّل طالبًا تجريبيًا من الصفحة الرئيسية.
- افتح `/admin` وسجّل الدخول باسم المستخدم المحدد وكلمة مرور حساب Supabase.
- تأكد من ظهور السجل.
- جرّب البحث والتعديل والحذف على سجل تجريبي.
- جرّب تصدير Excel.
- جرّب تصدير PDF؛ ستفتح نافذة الطباعة، اختر **Save as PDF / حفظ كملف PDF**.
- افتح الموقع في نافذة خاصة غير مسجل فيها، وتأكد أنك لا تستطيع الوصول إلى السجلات من صفحة الإدارة.

## ملاحظات أمنية وخصوصية مهمة

- لا تضف مفتاح Supabase `service_role` إلى ملفات الواجهة أو إلى متغيرات `NEXT_PUBLIC_*`.
- كلمة مرور الإدارة لا تُخزّن في المشروع؛ تُدار عبر Supabase Auth.
- صلاحيات قاعدة البيانات هي الحماية الأساسية: الزائر يستطيع الإرسال فقط، ولا يستطيع قراءة أو تعديل أو حذف سجلات الطلاب.
- اسم المستخدم الظاهر في الواجهة ليس سرًا أمنيًا؛ الحماية تعتمد على كلمة المرور وعلى وجود حساب المدير في `admin_users`.
- أرقام الهواتف بيانات شخصية. اجمع الحد الأدنى اللازم، ولا تشارك ملفات Excel/PDF إلا مع المخولين، واحذف السجلات التي لم تعد تحتاجها. بالنسبة للطلاب القاصرين، احصل على موافقة ولي الأمر قبل جمع رقم الهاتف.
- يحتوي نموذج التسجيل على حقل مخفي بسيط لتقليل بعض الإرسال الآلي، لكنه ليس بديلًا عن CAPTCHA أو تحديد معدل الطلبات. قبل نشر الرابط على نطاق واسع، أضف حماية إضافية من الرسائل المزعجة وراقب سجلات الاستخدام.
- احتفظ بنسخة احتياطية من قاعدة البيانات بشكل دوري، ولا تعتمد على تنزيل Excel وحده كنسخة احتياطية.

## هيكل الملفات

```text
multaqa-student-registration/
├── app/
│   ├── admin/page.tsx       # دخول الإدارة ولوحة الطلاب
│   ├── globals.css          # التصميم
│   ├── layout.tsx           # إعدادات الصفحة العربية
│   └── page.tsx             # نموذج تسجيل الطالب
├── lib/supabase.ts          # اتصال Supabase من المتصفح
├── supabase/schema.sql      # الجداول وسياسات RLS
├── .env.example             # نموذج متغيرات البيئة
├── .gitignore
├── next.config.ts
├── package.json
└── tsconfig.json
```

## مراجع رسمية

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel مع Next.js: https://vercel.com/docs/frameworks/full-stack/nextjs
- متغيرات البيئة في Vercel: https://vercel.com/docs/environment-variables
