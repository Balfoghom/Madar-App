# Madar | مدار — working synthetic demonstration

The application now opens with **Connected Journeys**, using the fitted cross-journey Random Forest alongside the existing SANED model. English is the default interface language. This is a synthetic decision-support prototype, not a live payment service.

## Start the improved app

Requires Node.js 22.13 or newer. No package installation or API key is required.

1. Open Terminal in this folder (the folder containing this README and `start.mjs`).
2. Run `npm start`.
3. Open **http://localhost:8090**.

On macOS, `Start Madar.command` is a convenience launcher. The single server supplies both the interface and `/api` routes; no second terminal or separate static server is needed. Stop it with Control+C.

## Rehearsal checklist

- [ ] Click **Assess demo portfolio**. The server groups 35 source events into six cases and calculates their model results.
- [ ] Open **Connected SANED sequence**: three contributors, three journeys, 12 events; comparator rules quiet, AI flagged, specialist review.
- [ ] Expand **Inspect source events** to examine real synthetic event times, identities and wage evidence.
- [ ] Compare **Routine activity** and **Legitimate restructuring**: neither model nor included comparator rules flags these examples.
- [ ] Open **Missing employer evidence**: abstention, no model score, request to complete evidence.
- [ ] Enter a reviewer name and evidence note, then save a routing decision. Refresh: the decision and original model result remain.
- [ ] Re-import the same event CSV: existing case assessments and reviews remain without duplicate queue entries.
- [ ] Open the investigation queue and monthly report. Select an empty month and confirm that its report has no cases.

The supplied event CSV is available through **Download event CSV**. Both the Connected Journeys upload and the existing Data Intake page accept it. Case labels are display metadata; model results are calculated from the supplied event evidence.

## Records and reset

The improved single-server launcher uses `.madar-data/` for new demo records. Manal's existing records in `anomaly-detection/data/` are preserved and are not automatically migrated. Set `ASSESSMENT_DATA_DIR` if deliberately using another record directory. Preserve that directory between restarts.

The existing Data Intake reset clears the current demo's saved assessments and reviews; use it only when you want a fresh rehearsal. Built-in indicator testing requests and legacy configuration review drafts are browser-local demonstration states, not completed governance approvals. Models do not retrain or activate rules from a decision.

## Validation

Run `npm test` from this folder. Tests cover model parity, held-out synthetic metrics, event grouping, invalid imports, abstention, duplicate imports, review persistence and stale assessment rejection. Browser checks also cover the connected journey, source evidence, incomplete case, review/reload, empty search and month filters. All model performance claims remain synthetic and require business and Data & AI validation before operational use.

## Hosting

This app can run as one Node service using `npm start`. Set `HOST=0.0.0.0`, a provider-supplied `PORT`, and an `ASSESSMENT_DATA_DIR` on a persistent volume. The included Dockerfile provides this layout with data at `/data`; its image build has not been verified here. Use one application instance with this file store. Multi-instance hosting requires transactional database storage.

For a privately shared demonstration, set `MADAR_DEMO_PASSWORD` through the host's secret settings (username: `madar`), and use the host's HTTPS endpoint. This optional shared demo gate is not enterprise role-based access control. Never place passwords in source files. Runtime records are excluded from the container build.

ChatGPT Sites supports compatible web apps. This Node HTTP server and filesystem persistence must be adapted to Sites' Worker runtime and supported persistent storage before hosting the complete experience there. Uploading `dist/` alone will not provide the model APIs or saved review history. No hosted site has been created or modified during this update.

Official Sites information: https://learn.chatgpt.com/docs/sites?surface=web

## Scope of this update

- Madar bilingual branding, an orbit-style mark and a focused English investigation workspace.
- Actual cross-journey inference and grouped CSV import, immutable model evidence, linked timelines and persistent specialist routing.
- Incomplete-case chart/filter fixes, working reporting period, corrected signal drill-down and empty selection, chronological activity, preserved uploaded identities, and fresh model health status.
- Legacy simulation preview no longer recalculates fitted-model cases; reported source conflicts require additional verification independently of the model.
- Indicator generation excludes non-risk and missing-evidence reason codes.

Still outside this prototype: live enterprise connections, automatic payment intervention, production model validation, full role-based case governance, an LLM summary service, automatic indicator activation and model retraining. The portfolio pages retain clearly labeled illustrative legacy cases; use Connected Journeys for the main fitted-model demonstration. Financial values are not supplied by the cross-journey examples and must not be presented as prevented loss.

---

## Original delivery documentation (legacy two-server startup)

The material below describes Manal's original delivery. Use the single-server instructions above for the improved Madar demo.

# GOSI Adaptive Behavioral Intelligence

نموذج أولي للهاكثون يساعد المختص على مراجعة الحالات: يستقبل حالة أو ملف CSV ببيانات وهمية، يعرض نتائج القواعد وتحليل السلوك، ويقترح مسار المراجعة. القرار النهائي يبقى للمختص.

## كيف يعمل؟

1. تدخل الحالة من **New Assessment** أو ترفع ملفًا من **Data Intake**.
2. ترسل الواجهة البيانات إلى الباكند، الذي يشغّل النموذج المحفوظ للمسار المختار.
3. تظهر النتيجة والأسباب وخصائص النموذج في **Intelligence Queue**. درجة القواعد ونسبة غرابة السلوك تظهران بشكل مستقل.
4. يعتمد المختص التوصية أو يعدّلها أو يرفضها، ويسجّل نتيجة المراجعة.
5. تُحفظ النتائج وقرارات المختص محليًا، وتستخدمها لوحات المتابعة والتقرير الشهري.

إذا كانت الأدلة ناقصة، تظهر «استكمال البيانات». وإذا تعذّر الاتصال بالباكند، تظهر رسالة خطأ دون إنشاء تقييم بديل.

## وين الكود؟ وش وظيفة الملفات؟

| المجلد أو الملف | وظيفته |
|---|---|
| [`dist/index.html`](dist/index.html) | هيكل الصفحات والنماذج والأزرار. |
| [`dist/styles.css`](dist/styles.css) | الألوان والتنسيق وأحجام العناصر وتناسب العرض مع الشاشة. |
| [`dist/app.js`](dist/app.js) | تفاعل الواجهة، قراءة CSV، الاتصال بالباكند، عرض الحالات والرسوم والتقارير؛ ويحتوي أيضًا على المحاكاة الإحصائية القديمة. |
| [`anomaly-detection/server.mjs`](anomaly-detection/server.mjs) | الباكند: يستقبل طلبات التقييم والرفع، ويحفظ الحالات وقرارات المختص والإعدادات. |
| [`lib/assessment-adapter.mjs`](anomaly-detection/lib/assessment-adapter.mjs) | يتحقق من بيانات الحالة، يختار النموذج، ويجهّز النتيجة والأسباب ومسار المراجعة للواجهة. |
| [`lib/detector.mjs`](anomaly-detection/lib/detector.mjs) | يحوّل أحداث ساند إلى خصائص، ويشغّل نموذج ساند المحفوظ ويعيد درجة الشذوذ والأسباب. |
| [`lib/journey-detector.mjs`](anomaly-detection/lib/journey-detector.mjs) | يشغّل النماذج المحفوظة لبقية المسارات على خصائص الحالة المدخلة. |
| [`anomaly-detection/data/`](anomaly-detection/data/) | ملفات النماذج، الحالات المرجعية الوهمية، وبيانات تقييم النموذج. تُنشأ فيه أيضًا سجلات التجارب المحلية المستبعدة من Git. |
| [`ml/`](anomaly-detection/ml/) و[`lib/journey-training.mjs`](anomaly-detection/lib/journey-training.mjs) | كود التدريب المنفصل الموجود في المشروع؛ لا يعمل تلقائيًا عند تشغيل البرنامج أو رفع الحالات. |
| [`anomaly-detection/examples/`](anomaly-detection/examples/) | ملف CSV جاهز للتجربة وأمثلة على نتائج التقييم. |
| [`anomaly-detection/tests/`](anomaly-detection/tests/) | اختبارات صحة نتائج النموذج، الربط بالباكند، حفظ القرارات ومسار المراجعة. |
| [`servicenow/`](servicenow/) | ملفات CSV لتعريف الجداول والأدوار وحالات وأحداث ومؤشرات وهمية لتجربة ServiceNow؛ ليست اتصالًا مباشرًا به. |

## وش الموجود في الواجهة؟

| الصفحة | استخدامها |
|---|---|
| **Dashboard / Executive Dashboard** | متابعة الحالات وتوزيع المخاطر والمؤشرات الإجمالية. |
| **Intelligence Queue** | البحث عن حالة، قراءة الأدلة، وتسجيل قرار المختص. |
| **Monthly Business Report** | تجميع النتائج حسب الشهر والمسار وإعداد تقرير قابل للطباعة. |
| **Data Intake** | إدخال حالات وهمية من ملف CSV أو نص CSV. |
| **Scoring Simulation** | تجربة أوزان المحاكاة الإحصائية القديمة؛ لا تعيد تدريب النماذج. |
| **Risk Indicators** | عرض المؤشرات ومقترحات المؤشرات للمراجعة. |
| **Model & Governance / Appendix: Scoring** | عرض معلومات النماذج والحوكمة وشرح التقييم. |
| **AI Backend Demo** | تجربة حالات النموذج وعرض نتائج الباكند المحفوظة. |

## وين الذكاء الاصطناعي؟

يستخدم المشروع **Isolation Forest** لاكتشاف السلوك غير المعتاد. نموذج ساند يقرأ خصائص مستخرجة من أحداث الحالة، وبقية المسارات تستخدم خصائصها المحددة مع نماذجها المحفوظة. المسارات هي: ساند، صرف المنافع، تسجيل المنشآت، التقاعد، منفعة الأمومة، والاشتراكات والأجور.

تظهر نتيجة النموذج بإصداره ودرجة الشذوذ ونسبة الغرابة وإشارات المراجعة والخصائص المستخدمة. نسبة الغرابة **ليست احتمال احتيال**. ملخص الحالة نص منظم يولّده الكود، ولا يستخدم نموذج محادثة. رفع الحالات وقرارات المختص لا يدرّبان النموذج تلقائيًا؛ التدريب مسؤولية مالك النموذج.

الحالات التجريبية القديمة تستخدم حسابات **Median/MAD** وأوزان المحاكاة، وتُميّز عن نتائج النموذج. جميع البيانات المرفقة وهمية، ونتائج التجربة لا تثبت الأداء على بيانات المؤسسة الحقيقية.

## التشغيل والتجربة

تحتاج **Node.js 22.13 أو أحدث** و**Python 3**. افتح نافذتي Terminal من مجلد المشروع.

في الأولى، شغّل الباكند:

```sh
cd anomaly-detection
npm start
```

في الثانية، شغّل الواجهة:

```sh
cd dist
python3 -m http.server 8080 --bind 127.0.0.1
```

افتح [localhost:8080](http://localhost:8080)، واترك النافذتين تعملان. للإيقاف اضغط **Control+C**. يمكن قراءة حالة الباكند من [health](http://127.0.0.1:8787/health).

للتجربة: افتح **Data Intake** وارفع [ملف الحالات الوهمية](anomaly-detection/examples/synthetic-model-evidence.csv)، ثم افتح الحالات في **Intelligence Queue** لمشاهدة النتائج. لا تحتاج إلى تدريب النموذج لتشغيل البرنامج.

## ملفات الشرح الأخرى

- [INTEGRATION.md](anomaly-detection/INTEGRATION.md): طريقة ربط الواجهة بالنموذج والحقول التي يعيدها الباكند.
- [شرح النموذج](anomaly-detection/README.md) و[خصائص المسارات](anomaly-detection/JOURNEY_FEATURES.md): تفاصيل التحليل والتقييم.
- [SCENARIO_REVIEW.md](anomaly-detection/SCENARIO_REVIEW.md): خطوات مراجعة السيناريوهات واعتمادها في العرض التجريبي.
- [AI_SOLUTION_DESIGN.md](AI_SOLUTION_DESIGN.md) و[TECHNICAL_BLUEPRINT.md](TECHNICAL_BLUEPRINT.md): فكرة الحل وتصميمه التقني.
- [DATA_DICTIONARY.md](DATA_DICTIONARY.md)، [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md)، [VDI_DEPLOYMENT_GUIDE.md](VDI_DEPLOYMENT_GUIDE.md): معاني البيانات، منهج التقييم الأصلي، ودليل التشغيل. بعض هذه الوثائق تصف التصميم الأولي؛ تفاصيل الربط الحالي موضحة في `INTEGRATION.md`.
