// Rule tests for the engine embedded in index.html.
// Run: node tests.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
if (!m) throw new Error('engine block not found');
const mod = { exports: {} };
new Function('module', m[1])(mod);
const O = mod.exports;

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
const base = x => Object.assign({ sex: 'm', age: 60, ht: 165, wt: 60, setting: 'ward', route: 'ng', oral: 0, feeds: 6, wBasis: 'auto', ibwM: 'tw', avail: 'any', form: 'any', c: {}, rx: [] }, x);
const N = x => O.needs(base(x));
const best = x => { const s = base(x); const n = O.needs(s); return O.plans(s, n); };
const items = pl => pl.list[0].items.map(i => O.byId[i.id]);

console.log('Product data');
t('every product has id, name, category, serving and source confidence', () => O.P.forEach(p => { assert.ok(p.id && p.name && O.CAT[p.cat] && p.serving, p.id); assert.ok(['high', 'medium', 'low'].includes(p.conf), p.id); }));
t('exactly the 41 items on the hospital list, each with its list name', () => { assert.equal(O.P.length, 41); assert.equal(O.HOSP.length, 41); O.P.forEach(p => assert.ok(p.hosp, p.id)); assert.equal(new Set(O.P.map(p => p.hosp)).size, 41); });
t('product ids are unique', () => assert.equal(new Set(O.P.map(p => p.id)).size, O.P.length));
t('main formulas have kcal and protein', () => O.P.filter(p => O.BASE.includes(p.cat)).forEach(p => { assert.ok(p.kcal > 0, p.id); assert.ok(p.pro !== null && p.pro !== undefined, p.id); }));
t('hospital codes are 7 digits', () => O.P.filter(p => p.code).forEach(p => assert.match(p.code, /^\d{7}$/, p.id)));
t('every item is supplied as tube feeding or self-pay', () => O.P.forEach(p => assert.ok(p.kitchen || p.selfpay, p.id)));
t('新普派 corrected to 65 g / 260 kcal / 13 g', () => { const p = O.byId['efi-peptide']; assert.equal(p.kcal, 260); assert.equal(p.pro, 13); });
t('元氣強 corrected to 104 kcal / 8.4 g', () => { const p = O.byId['efi-yuanqi']; assert.equal(p.kcal, 104); assert.equal(p.pro, 8.4); });

console.log('Weights');
t('IBW (165-80)×0.7 = 59.5', () => assert.equal(N({}).ibw, 59.5));
t('female IBW (150-70)×0.6 = 48', () => assert.equal(N({ sex: 'f', ht: 150, wt: 40 }).ibw, 48));
t('BMI-22 IBW option', () => assert.equal(N({ ibwM: 'bmi22' }).ibw, 59.9));
t('underweight → actual weight (no overfeeding)', () => { const n = N({ sex: 'f', ht: 150, wt: 40 }); assert.equal(n.basis, 'actual'); assert.equal(n.dw, 40); });
t('obese → adjusted weight IBW + 0.25 × excess', () => { const n = N({ ht: 170, wt: 100 }); assert.equal(n.basis, 'adj'); assert.equal(n.dw, 72.3); });
t('dry weight replaces actual weight', () => assert.equal(N({ wt: 60, dry: 57 }).dw, 57));
t('missing sex → not ready, error shown', () => { const n = N({ sex: '' }); assert.equal(n.ready, false); assert.ok(n.errs.length); });
t('missing height → not ready (no silent default)', () => assert.equal(N({ ht: '' }).ready, false));
t('age <18 → error', () => assert.ok(N({ age: 16 }).errs.some(e => /成人/.test(e))));

console.log('Energy and protein targets');
t('adult ward: 30 kcal/kg, 1.0 g/kg', () => { const n = N({ age: 50 }); assert.equal(n.kcalKg.t, 30); assert.equal(n.proKg.t, 1.0); assert.equal(n.kcal, 1800); });
t('≥65 y: protein 1.2 g/kg', () => assert.equal(N({ age: 70 }).proKg.t, 1.2));
t('ICU: 25 kcal/kg, 1.3 g/kg', () => { const n = N({ setting: 'icu' }); assert.equal(n.kcalKg.t, 25); assert.equal(n.proKg.t, 1.3); });
t('surgery 1.5 g/kg; wound 1.5; cancer 1.2; cirrhosis 35 kcal', () => {
  assert.equal(N({ c: { surg: true } }).proKg.t, 1.5);
  assert.equal(N({ c: { wound: true } }).proKg.t, 1.5);
  assert.equal(N({ age: 50, c: { onc: true } }).proKg.t, 1.2);
  assert.equal(N({ c: { cirr: true } }).kcalKg.t, 35);
});
t('CKD outpatient non-DM: 0.6 g/kg (KDOQI)', () => assert.equal(N({ setting: 'opd', c: { ckd: true } }).proKg.t, 0.6));
t('CKD outpatient + DM: 0.7 g/kg', () => assert.equal(N({ setting: 'opd', c: { ckd: true, dm: true } }).proKg.t, 0.7));
t('CKD inpatient, no acute illness: 0.7 g/kg (0.6–0.8)', () => { const n = N({ c: { ckd: true } }); assert.equal(n.proKg.t, 0.7); assert.equal(n.proKg.hi, 0.8); });
t('CKD + surgery: not restricted, 1.0 g/kg (ESPEN 2021)', () => assert.equal(N({ c: { ckd: true, surg: true } }).proKg.t, 1.0));
t('CKD caps protein from other conditions and says so', () => { const n = N({ age: 70, c: { ckd: true, wound: true } }); assert.equal(n.proKg.t, 1.0); assert.ok(n.notes.some(x => /CKD/.test(x))); });
t('dialysis: 1.2 g/kg; dialysis + ICU: 1.3', () => { assert.equal(N({ c: { hd: true } }).proKg.t, 1.2); assert.equal(N({ setting: 'icu', c: { hd: true } }).proKg.t, 1.3); });
t('dialysis wins over CKD-ND when both ticked', () => assert.equal(N({ c: { hd: true, ckd: true } }).proKg.t, 1.2));
t('override kcal/kg and protein g/kg', () => { const n = N({ kcalKg: 28, proKg: 1.4 }); assert.equal(n.kcal, 1680); assert.equal(n.pro, 84); });

console.log('Fluid, intake gap, screening');
t('fluid 30 mL/kg', () => assert.equal(N({}).fluid, 1800));
t('fluid restriction caps fluid', () => { const n = N({ c: { fluidR: true }, fluidLim: 1200 }); assert.equal(n.fluid, 1200); assert.ok(n.fluidLimited); });
t('fluid restriction without a number → error', () => assert.ok(N({ c: { fluidR: true } }).errs.length));
t('oral 50% → supplements cover half', () => { const n = N({ age: 50, route: 'oral', oral: 50 }); assert.equal(n.gapKcal, 900); assert.equal(n.gapPro, 30); });
t('refeeding: BMI <16 alone → high risk, 10 kcal/kg', () => { const n = N({ sex: 'f', ht: 155, wt: 37 }); assert.ok(n.refeed.high); assert.equal(n.refeed.startKg, 10); });
t('refeeding: >15 days no intake → extreme, 5 kcal/kg', () => assert.equal(N({ lowIntake: '15' }).refeed.startKg, 5));
t('refeeding: two minor criteria → high', () => assert.ok(N({ sex: 'f', ht: 155, wt: 43, lowIntake: '5' }).refeed.high));
t('refeeding: one minor criterion → not high', () => assert.ok(!N({ lowIntake: '5' }).refeed.high));
t('GLIM: 10% loss in 3 mo + cancer → malnutrition', () => { const n = N({ wt: 54, uwt: 60, uwtSpan: 'le3', c: { onc: true } }); assert.ok(n.glim.met); });
t('GLIM: Asian BMI cut-off 20 at ≥70 y', () => assert.ok(N({ age: 75, wt: 53 }).glim.pheno.some(x => /BMI/.test(x))));

console.log('Recommended plans');
t('three plans with different main formulas', () => { const pl = best({}); assert.equal(pl.list.length, 3); assert.equal(new Set(pl.list.map(p => p.items[0].id)).size, 3); });
t('general tube feeding: best plan within 90–110%', () => { const p = best({}).list[0]; assert.ok(p.kr >= 90 && p.kr <= 110, p.kr); assert.ok(p.pr >= 90 && p.pr <= 120, p.pr); });
t('CKD outpatient: no dialysis formula or protein module, protein ≤ cap', () => {
  const s = base({ setting: 'opd', route: 'oral', oral: 60, c: { ckd: true } }), n = O.needs(s), pl = O.plans(s, n);
  pl.list[0].items.forEach(i => assert.ok(!['hd', 'promod'].includes(O.byId[i.id].cat), i.id));
  assert.ok(pl.list[0].t.pro <= n.ckdCap * 0.4 * 1.05);
});
t('dialysis: best plan uses a dialysis product, never a low-protein renal formula', () => {
  const its = items(best({ c: { hd: true } }));
  assert.ok(its.some(p => p.cat === 'hd' || p.id === 'efi-yuanqi'));
  assert.ok(!its.some(p => p.cat === 'ckd'));
});
t('J-tube: best plan is a peptide formula', () => assert.equal(items(best({ route: 'jt' }))[0].cat, 'pep'));
t('fluid limit 1200 mL: best plan volume within limit', () => assert.ok(best({ c: { fluidR: true }, fluidLim: 1200 }).list[0].t.vol <= 1200));
t('oral route: at most 3 servings of main formula', () => best({ route: 'oral', oral: 0 }).list.forEach(p => assert.ok(p.items[0].q <= 3)));
t('kitchen-only filter: every item is a tube-feeding supply', () => best({ avail: 'kitchen' }).list.forEach(p => p.items.forEach(i => assert.ok(O.byId[i.id].kitchen, i.id))));
t('self-pay filter: every item has an order code', () => best({ avail: 'selfpay' }).list.forEach(p => p.items.forEach(i => assert.ok(O.byId[i.id].code, i.id))));
t('powder filter respected for main formula', () => best({ form: 'powder' }).list.forEach(p => assert.equal(O.byId[p.items[0].id].form, 'powder')));
t('tube route never offers care food', () => best({}).list.forEach(p => p.items.forEach(i => assert.notEqual(O.byId[i.id].cat, 'food'))));
t('diabetes: best plan uses a diabetes formula', () => assert.equal(items(best({ c: { dm: true } }))[0].cat, 'dm'));
t('intake already ≥ need → no plans', () => assert.equal(best({ route: 'oral', oral: 100 }).list.length, 0));

const SCEN = [{}, { route: 'oral', oral: 50 }, { route: 'jt' }, { setting: 'icu', ht: 170, wt: 100 }, { c: { dm: true } }, { c: { ckd: true }, setting: 'opd', route: 'oral', oral: 60 }, { c: { hd: true } }, { c: { hd: true, fluidR: true }, fluidLim: 1000, route: 'oral', oral: 50 }, { c: { onc: true }, route: 'oral', oral: 40 }, { c: { wound: true, surg: true, burn: true, press: true, dysph: true }, route: 'oral', oral: 30 }, { c: { fluidR: true }, fluidLim: 1200 }, { c: { malab: true } }, { avail: 'kitchen' }, { avail: 'selfpay' }, { form: 'liquid', route: 'oral', oral: 0 }];
t('every recommended item, in every scenario, is on the hospital list', () => SCEN.forEach(x => { const s = base(x), n = O.needs(s); O.plans(s, n).list.forEach(p => p.items.forEach(i => assert.ok(O.byId[i.id] && O.byId[i.id].hosp, JSON.stringify(x) + ' ' + i.id))); O.extras(s, n).forEach(e => e.items.forEach(p => assert.ok(p.hosp, p.id))); }));
console.log('Prescription review');
const rv = (x, rx) => { const s = base(x); return O.review(s, O.needs(s), rx); };
t('very low energy → red alert (old page said "符合")', () => assert.ok(rv({}, [{ id: 'efi-classic55', q: 2 }]).A.some(a => a.c === 'stop' && /熱量/.test(a.t))));
t('on-target prescription → no red alerts', () => assert.ok(!rv({ age: 50 }, [{ id: 'efi-20', q: 7 }]).A.some(a => a.c === 'stop')));
t('CKD over protein cap → red alert', () => assert.ok(rv({ c: { ckd: true } }, [{ id: 'efi-20', q: 7 }]).A.some(a => a.c === 'stop' && /CKD/.test(a.t))));
t('dialysis on low-protein renal formula → warning', () => assert.ok(rv({ c: { hd: true } }, [{ id: 'sentosa-lpf', q: 4 }]).A.some(a => /低蛋白/.test(a.x || a.t))));
t('volume over fluid limit → red alert', () => assert.ok(rv({ c: { fluidR: true }, fluidLim: 1000 }, [{ id: 'efi-20', q: 6 }]).A.some(a => a.c === 'stop' && /液體/.test(a.t))));
t('Juven amino acids are not counted as protein', () => { const tt = O.totals([{ id: 'abt-juven', q: 2 }]); assert.equal(tt.pro, 0); assert.ok(tt.aa > 0); });
t('half-empty quantity is ignored, not NaN', () => { const tt = O.totals([{ id: 'efi-20', q: '' }, { id: '', q: 2 }]); assert.equal(tt.kcal, 0); });
t('oral < 400 kcal ONS → ESPEN minimum note', () => assert.ok(rv({ route: 'oral', oral: 80 }, [{ id: 'efi-20', q: 1 }]).A.some(a => /400 kcal/.test(a.t))));

console.log('Schedule and order text');
t('NG bolus 6 feeds: per-feed volume and water', () => { const s = base({}), n = O.needs(s), tt = O.totals([{ id: 'efi-20', q: 6 }]); const sc = O.schedule(s, n, tt); assert.equal(sc.mode, 'bolus'); assert.equal(sc.per, 250); assert.ok(sc.flush > 0); });
t('J-tube → continuous rate over 20 h', () => { const s = base({ route: 'jt' }), n = O.needs(s), tt = O.totals([{ id: 'efi-peptide', q: 6 }]); assert.equal(O.schedule(s, n, tt).rate, 78); });
t('order text lists code, quantity and totals', () => { const s = base({}), n = O.needs(s); const tx = O.orderText(s, n, [{ id: 'efi-20', q: 6 }], null, '2026-10-04'); assert.match(tx, /2814201/); assert.match(tx, /× 6 罐\/日/); assert.match(tx, /合計：熱量 1500 kcal/); });
t('order text uses the hospital-list name', () => { const s = base({}), n = O.needs(s); assert.match(O.orderText(s, n, [{ id: 'abt-twocal', q: 2 }], null, ''), /2814039 亞培 安素雙卡\(香草口味\)/); });
t('order text marks kitchen-only items', () => { const s = base({}), n = O.needs(s); assert.match(O.orderText(s, n, [{ id: 'efi-17', q: 6 }], null, ''), /膳食供應/); });
t('kitchen-only items can be used orally without a warning', () => { const s = base({ route: 'oral' }), n = O.needs(s), f = O.fit(O.byId['efi-17'], O.ctxOf(s, n)); assert.ok(f.ok); assert.equal(f.notes.length, 0); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
