"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

type Student = {
  id: string;
  student_name: string;
  school_name: string;
  grade: string;
  section: string;
  phone: string;
  institution_name: string;
  created_at: string;
};

type EditableStudent = Omit<Student, "id" | "created_at">;

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
const EMPTY_EDIT: EditableStudent = {
  student_name: "",
  school_name: "",
  grade: "",
  section: "",
  phone: "",
  institution_name: "مؤسسة ملتقى العلم والدين",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Baghdad",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return entities[character];
  });
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditableStudent>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const verifyAdmin = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      if (error || data !== true) {
        await supabase.auth.signOut();
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    setLoadError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("students")
        .select("id, student_name, school_name, grade, section, phone, institution_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStudents((data ?? []) as Student[]);
    } catch (error) {
      console.error("Loading students failed:", error);
      setLoadError("تعذّر تحميل السجلات. تحقق من إعدادات صلاحيات Supabase.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    void verifyAdmin();
  }, [verifyAdmin]);

  useEffect(() => {
    if (isAdmin) void loadStudents();
  }, [isAdmin, loadStudents]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    if (!term) return students;
    return students.filter((student) =>
      [student.student_name, student.school_name, student.grade, student.section, student.phone, student.institution_name]
        .some((value) => value.toLocaleLowerCase("ar").includes(term))
    );
  }, [students, search]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    if (!isSupabaseConfigured()) {
      setLoginError("أكمل إعداد Supabase أولًا من ملف البيئة.");
      return;
    }
    if (!ADMIN_EMAIL || !ADMIN_USERNAME) {
      setLoginError("أضف اسم المستخدم وبريد حساب الإدارة إلى إعدادات البيئة.");
      return;
    }
    if (username.trim() !== ADMIN_USERNAME) {
      setLoginError("اسم المستخدم أو كلمة المرور غير صحيحة.");
      return;
    }
    setLoginLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
      if (error) throw error;
      const { data: adminResult, error: adminError } = await supabase.rpc("is_admin");
      if (adminError || adminResult !== true) {
        await supabase.auth.signOut();
        throw new Error("هذا الحساب غير مضاف إلى قائمة مديري الموقع في قاعدة البيانات.");
      }
      setPassword("");
      setIsAdmin(true);
      setActionMessage("تم تسجيل الدخول بنجاح.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر تسجيل الدخول.";
      setLoginError(message.includes("Invalid login credentials") ? "اسم المستخدم أو كلمة المرور غير صحيحة." : message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setStudents([]);
    setActionMessage("");
  }

  function openEdit(student: Student) {
    setEditing(student);
    setEditForm({
      student_name: student.student_name,
      school_name: student.school_name,
      grade: student.grade,
      section: student.section,
      phone: student.phone,
      institution_name: student.institution_name,
    });
    setActionMessage("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (Object.values(editForm).some((value) => !value.trim())) {
      setActionMessage("يرجى ملء جميع الحقول.");
      return;
    }
    setSaving(true);
    setActionMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("students").update({
        student_name: editForm.student_name.trim(),
        school_name: editForm.school_name.trim(),
        grade: editForm.grade.trim(),
        section: editForm.section.trim(),
        phone: editForm.phone.trim(),
        institution_name: editForm.institution_name.trim(),
      }).eq("id", editing.id);
      if (error) throw error;
      setEditing(null);
      setActionMessage("تم تحديث بيانات الطالب.");
      await loadStudents();
    } catch (error) {
      console.error("Updating student failed:", error);
      setActionMessage("تعذّر حفظ التعديلات. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(`هل تريد حذف سجل الطالب «${student.student_name}» نهائيًا؟`);
    if (!confirmed) return;
    setActionMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("students").delete().eq("id", student.id);
      if (error) throw error;
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setActionMessage("تم حذف السجل.");
    } catch (error) {
      console.error("Deleting student failed:", error);
      setActionMessage("تعذّر حذف السجل. حاول مرة أخرى.");
    }
  }

  async function exportExcel() {
    if (filteredStudents.length === 0) return;
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "مؤسسة ملتقى العلم والدين";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("الطلاب", { views: [{ rightToLeft: true }] });
      sheet.columns = [
        { header: "اسم الطالب", key: "student_name", width: 28 },
        { header: "اسم المدرسة", key: "school_name", width: 28 },
        { header: "الصف", key: "grade", width: 18 },
        { header: "الشعبة", key: "section", width: 14 },
        { header: "رقم الهاتف", key: "phone", width: 20 },
        { header: "اسم المؤسسة", key: "institution_name", width: 30 },
        { header: "تاريخ التسجيل", key: "created_at", width: 24 },
      ];
      sheet.addRows(filteredStudents.map((student) => ({
        student_name: student.student_name,
        school_name: student.school_name,
        grade: student.grade,
        section: student.section,
        phone: student.phone,
        institution_name: student.institution_name,
        created_at: formatDate(student.created_at),
      })));
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
      sheet.eachRow((row) => {
        row.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `students-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionMessage("تم تجهيز ملف Excel.");
    } catch (error) {
      console.error("Excel export failed:", error);
      setActionMessage("تعذّر تصدير Excel. حاول تحديث الصفحة.");
    }
  }

  function exportPdf() {
    if (filteredStudents.length === 0) return;
    const printWindow = window.open("", "_blank", "width=1100,height=750");
    if (!printWindow) {
      setActionMessage("اسمح بفتح النوافذ المنبثقة حتى تتمكن من طباعة التقرير.");
      return;
    }
    const rows = filteredStudents.map((student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(student.student_name)}</td>
        <td>${escapeHtml(student.school_name)}</td>
        <td>${escapeHtml(student.grade)}</td>
        <td>${escapeHtml(student.section)}</td>
        <td dir="ltr">${escapeHtml(student.phone)}</td>
        <td>${escapeHtml(student.institution_name)}</td>
        <td>${escapeHtml(formatDate(student.created_at))}</td>
      </tr>`).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>سجل الطلاب - مؤسسة ملتقى العلم والدين</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Tahoma, Arial, sans-serif; color: #111827; }
        h1 { font-size: 20px; margin: 0 0 6px; }
        p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th, td { border: 1px solid #d1d5db; padding: 7px 6px; text-align: right; }
        th { background: #f3f4f6; font-weight: bold; }
        tr { page-break-inside: avoid; }
        .meta { margin-top: 14px; font-size: 10px; color: #6b7280; }
      </style></head><body>
      <h1>سجل الطلاب — مؤسسة ملتقى العلم والدين</h1>
      <p>عدد السجلات: ${filteredStudents.length} | تاريخ التقرير: ${escapeHtml(formatDate(new Date().toISOString()))}</p>
      <table><thead><tr><th>#</th><th>اسم الطالب</th><th>اسم المدرسة</th><th>الصف</th><th>الشعبة</th><th>رقم الهاتف</th><th>المؤسسة</th><th>تاريخ التسجيل</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="meta">وثيقة إدارية — مؤسسة ملتقى العلم والدين</div>
      <script>window.onload = () => window.print();</script>
      </body></html>`);
    printWindow.document.close();
    setActionMessage("في نافذة الطباعة اختر «حفظ كملف PDF».");
  }

  if (checking) {
    return <main className="admin-page"><div className="admin-card centered"><div className="spinner" /><p>جارٍ التحقق من الجلسة...</p></div></main>;
  }

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <section className="admin-card login-card">
          <a className="back-link" href="/">→ العودة إلى صفحة التسجيل</a>
          <div className="brand-mark small" aria-hidden="true">م</div>
          <p className="eyebrow">مؤسسة ملتقى العلم والدين</p>
          <h1>دخول الإدارة</h1>
          <p className="intro">أدخل بيانات حساب الإدارة للوصول إلى سجلات الطلاب.</p>
          <form className="registration-form" onSubmit={handleLogin}>
            <label className="field">
              <span>اسم المستخدم</span>
              <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="اسم المستخدم" />
            </label>
            <label className="field">
              <span>كلمة المرور</span>
              <input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" />
            </label>
            {loginError && <div className="notice error" role="alert">{loginError}</div>}
            <button className="primary-button" type="submit" disabled={loginLoading}>
              {loginLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
          <p className="login-hint">الدخول مخصص للحساب الإداري الذي تمت إضافته في Supabase.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">مؤسسة ملتقى العلم والدين</p>
          <h1>لوحة إدارة الطلاب</h1>
        </div>
        <div className="header-actions">
          <a className="secondary-button" href="/">صفحة التسجيل</a>
          <button className="text-button" onClick={handleLogout}>تسجيل الخروج</button>
        </div>
      </header>

      <section className="stats-row" aria-label="إحصائيات الطلاب">
        <div className="stat-card"><span>إجمالي الطلاب</span><strong>{students.length.toLocaleString("ar-IQ")}</strong></div>
        <div className="stat-card"><span>نتائج البحث</span><strong>{filteredStudents.length.toLocaleString("ar-IQ")}</strong></div>
      </section>

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>سجلات التسجيل</h2>
            <p>يمكنك البحث أو تعديل البيانات أو تصدير النتائج المعروضة.</p>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button" onClick={exportExcel} disabled={!filteredStudents.length}>تصدير Excel</button>
            <button className="secondary-button" onClick={exportPdf} disabled={!filteredStudents.length}>تصدير PDF</button>
            <button className="icon-button" onClick={() => void loadStudents()} disabled={loadingStudents} aria-label="تحديث السجلات" title="تحديث">↻</button>
          </div>
        </div>

        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الطالب أو المدرسة أو الهاتف..." aria-label="البحث في سجلات الطلاب" />
        </label>

        {actionMessage && <div className="notice success compact" role="status">{actionMessage}</div>}
        {loadError && <div className="notice error compact" role="alert">{loadError}</div>}

        <div className="table-wrap">
          <table className="students-table">
            <thead><tr><th>الطالب</th><th>المدرسة</th><th>الصف</th><th>الشعبة</th><th>الهاتف</th><th>المؤسسة</th><th>تاريخ التسجيل</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {loadingStudents ? (
                <tr><td colSpan={8} className="empty-cell">جارٍ تحميل السجلات...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={8} className="empty-cell">لا توجد سجلات مطابقة.</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="student-name">{student.student_name}</td>
                  <td>{student.school_name}</td>
                  <td>{student.grade}</td>
                  <td>{student.section}</td>
                  <td dir="ltr" className="phone-cell">{student.phone}</td>
                  <td>{student.institution_name}</td>
                  <td className="date-cell">{formatDate(student.created_at)}</td>
                  <td><div className="row-actions"><button className="table-action" onClick={() => openEdit(student)}>تعديل</button><button className="table-action danger-text" onClick={() => void deleteStudent(student)}>حذف</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">يتم تطبيق البحث على السجلات المحمّلة في لوحة الإدارة.</p>
      </section>

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
          <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <div className="modal-heading"><div><p className="eyebrow">إدارة السجل</p><h2 id="edit-title">تعديل بيانات الطالب</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="إغلاق">×</button></div>
            <form className="registration-form" onSubmit={saveEdit}>
              <div className="form-grid">
                {([
                  ["student_name", "اسم الطالب"], ["school_name", "اسم المدرسة"], ["grade", "الصف"],
                  ["section", "الشعبة"], ["phone", "رقم الهاتف"], ["institution_name", "اسم المؤسسة"],
                ] as const).map(([field, label]) => (
                  <label className="field" key={field}>
                    <span>{label}</span>
                    <input value={editForm[field]} onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))} required maxLength={field === "phone" ? 25 : 160} />
                  </label>
                ))}
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>إلغاء</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
