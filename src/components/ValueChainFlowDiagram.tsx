import React, { useState } from 'react';
import { CountryPCWIDataset } from '../types';
import {
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  Flame,
  Trash2,
  Globe,
  Recycle,
  PackageCheck
} from 'lucide-react';

interface Props {
  dataset: CountryPCWIDataset;
  onJumpToCard: (cardNumber: number) => void;
}

export const ValueChainFlowDiagram: React.FC<Props> = ({ dataset, onJumpToCard }) => {
  const [pvcFilter, setPvcFilter] = useState<'ALL' | 'Rigid PVC' | 'Flexible PVC'>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('generated');
  const [showAuditOverlay, setShowAuditOverlay] = useState<boolean>(true);

  const isItaly = dataset.countryCode === 'IT';

  const getFilteredTonnes = (rigid: number, flexible: number, both = 0) => {
    if (pvcFilter === 'Rigid PVC') return rigid;
    if (pvcFilter === 'Flexible PVC') return flexible;
    return rigid + flexible + both;
  };

  const genTonnes = getFilteredTonnes(
    dataset.card1.totalRigidGenerated,
    dataset.card1.totalFlexibleGenerated
  );
  const colTonnes = getFilteredTonnes(
    dataset.card2.totalRigidCollected,
    dataset.card2.totalFlexibleCollected
  );
  const mbItems = dataset.card3.q3_10_massBalance;
  const procRigid = isItaly
    ? 11000
    : mbItems.length > 0
    ? mbItems
        .filter((m) => m.pvcType === 'Rigid PVC')
        .reduce((s, m) => s + (m.totalQuantityTonnes ?? 0), 0)
    : Math.round(dataset.card3.totalSortedProcessed * 0.62);
  const procFlex = isItaly
    ? 33000
    : mbItems.length > 0
    ? mbItems
        .filter((m) => m.pvcType === 'Flexible PVC')
        .reduce((s, m) => s + (m.totalQuantityTonnes ?? 0), 0)
    : Math.round(dataset.card3.totalSortedProcessed * 0.35);
  const procBoth = isItaly
    ? 3000
    : mbItems.length > 0
    ? mbItems
        .filter((m) => m.pvcType === 'Both')
        .reduce((s, m) => s + (m.totalQuantityTonnes ?? 0), 0)
    : Math.round(dataset.card3.totalSortedProcessed * 0.03);
  const procTonnes = getFilteredTonnes(procRigid, procFlex, procBoth);

  const recTonnes = getFilteredTonnes(
    dataset.card4.totalRigidRecycled,
    dataset.card4.totalFlexibleRecycled,
    dataset.card4.totalMixedRecycled
  );

  const upItems = dataset.card4.q4_11_uptake;
  const uptakeRigid = isItaly
    ? 3430
    : upItems.length > 0
    ? upItems
        .filter((u) => u.pvcType === 'Rigid PVC')
        .reduce((s, u) => s + u.totalQuantityTonnes, 0)
    : Math.round(dataset.card4.totalUptakeTonnes * 0.65);
  const uptakeFlex = isItaly
    ? 23194
    : upItems.length > 0
    ? upItems
        .filter((u) => u.pvcType === 'Flexible PVC')
        .reduce((s, u) => s + u.totalQuantityTonnes, 0)
    : Math.round(dataset.card4.totalUptakeTonnes * 0.35);
  const uptakeTonnes = getFilteredTonnes(uptakeRigid, uptakeFlex);

  const collectionRatePct = genTonnes > 0 ? ((colTonnes / genTonnes) * 100).toFixed(1) : '0.0';
  const recyclingRateOfGenPct = genTonnes > 0 ? ((recTonnes / genTonnes) * 100).toFixed(1) : '0.0';
  const landfillSharePct =
    dataset.card1.totalGenerated > 0
      ? (
          (dataset.card6.q6_4_totalLandfilledEstimateTonnes / dataset.card1.totalGenerated) *
          100
        ).toFixed(1)
      : '0.0';

  const collectionEntitiesCount = dataset.facilities.filter((f) => f.stage === 'Collection').length;
  const convertingEntitiesCount = dataset.facilities.filter(
    (f) => f.stage === 'Converting (rPVC)'
  ).length;
  const uncollectedKt = Math.max(
    0,
    Math.round((dataset.card1.totalGenerated - dataset.card2.totalCollected) / 1000)
  );

  const totalExportTonnes = isItaly
    ? 11693
    : dataset.card2.q2_6_exports.reduce((sum, e) => sum + (e.totalQuantityTonnes ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-recovinyl-dark via-recovinyl-blue to-recovinyl-dark text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-recovinyl-green text-slate-950 uppercase tracking-wider">
              Slide 10 Architecture
            </span>
            <h3 className="text-lg font-bold tracking-tight">
              {dataset.flag} {dataset.countryName} — End-to-End Post-Consumer PVC Waste Mass Flow (
              {dataset.reportingYear})
            </h3>
          </div>
          <p className="text-xs text-recovinyl-light mt-1">
            Interactive value-chain mapping across Generation, Collection, Sorting/Pretreatment,
            Recycling, rPVC Uptake, Export, Incineration & Landfilling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-900/40 p-1 border border-white/15">
            {(['ALL', 'Rigid PVC', 'Flexible PVC'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPvcFilter(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  pvcFilter === mode
                    ? mode === 'Rigid PVC'
                      ? 'bg-recovinyl-blue text-white shadow'
                      : mode === 'Flexible PVC'
                      ? 'bg-recovinyl-green text-slate-950 shadow'
                      : 'bg-white text-recovinyl-dark shadow'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                {mode === 'ALL' ? 'All PVC (Rigid + Flex)' : mode}
              </button>
            ))}
          </div>

          {isItaly && (
            <button
              onClick={() => setShowAuditOverlay(!showAuditOverlay)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                showAuditOverlay
                  ? 'bg-recovinyl-green/25 border-recovinyl-green text-white'
                  : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-recovinyl-green" />
              {showAuditOverlay ? 'Hide Audit Badges' : 'Show Audit Badges'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-recovinyl-light/40 border-b border-recovinyl-blue/20">
        <div className="p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Generated (Q1.2)
          </div>
          <div className="text-xl font-extrabold text-recovinyl-blue mt-0.5">
            {genTonnes.toLocaleString()} t
          </div>
          <div className="text-[11px] text-slate-500">100% baseline EoL PVC</div>
        </div>
        <div className="p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Collected Separately (Q2.4)
          </div>
          <div className="text-xl font-extrabold text-recovinyl-dark mt-0.5">
            {colTonnes.toLocaleString()} t
          </div>
          <div className="text-[11px] text-recovinyl-blue font-medium">
            {collectionRatePct}% collection capture rate
          </div>
        </div>
        <div className="p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sorted / Processed (Q3.10)
          </div>
          <div className="text-xl font-extrabold text-recovinyl-blue mt-0.5">
            {procTonnes.toLocaleString()} t
          </div>
          <div className="text-[11px] text-slate-500">Sorting & pretreatment throughput</div>
        </div>
        <div className="p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            PC Recycled Output (Q4.6)
          </div>
          <div className="text-xl font-extrabold text-recovinyl-greenDark mt-0.5">
            {recTonnes.toLocaleString()} t
          </div>
          <div className="text-[11px] text-recovinyl-greenDark font-medium">
            {recyclingRateOfGenPct}% of generated EoL PVC
          </div>
        </div>
        <div className="p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Landfill + Incineration
          </div>
          <div className="text-xl font-extrabold text-recovinyl-dark mt-0.5">
            {(
              dataset.card6.q6_4_totalLandfilledEstimateTonnes +
              dataset.card5.totalIncineratedTonnes
            ).toLocaleString()}{' '}
            t
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            {landfillSharePct}% lost to landfill alone
          </div>
        </div>
      </div>

      {/* Main Interactive 4x2 Aligned Value Chain Grid */}
      <div className="p-6 bg-slate-50/50 overflow-x-auto">
        <div className="min-w-[1040px] space-y-3">
          {/* Primary Horizontal Value Chain Row: 4 Main Stages */}
          <div className="grid grid-cols-4 gap-5 items-stretch relative">
            {/* STAGE 1: GENERATED */}
            <div
              onClick={() => setSelectedStage('generated')}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between relative ${
                selectedStage === 'generated'
                  ? 'bg-recovinyl-light border-recovinyl-blue ring-4 ring-recovinyl-blue/15 shadow-md'
                  : 'bg-recovinyl-light/60 border-recovinyl-blue/35 hover:border-recovinyl-blue'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Stage 1 • Card 1 (Q1.1–1.2)
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase">
                      Post-Consumer PVC Waste Generated
                    </h4>
                  </div>
                  <div className="bg-recovinyl-blue text-white px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {genTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {(pvcFilter === 'ALL' || pvcFilter === 'Rigid PVC') && (
                  <div className="mb-2.5 bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="text-xs font-bold text-recovinyl-dark flex justify-between">
                      <span>RIGID PVC</span>
                      <span>{dataset.card1.totalRigidGenerated.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        <li>
                          Building & construction → <b>115,749 t</b>
                        </li>
                        <li>
                          Large urban waste → <b>19,068 t</b>
                        </li>
                        <li>
                          Furniture → <b>13,650 t</b>
                        </li>
                        <li>
                          Advertising (rigid) → <b>8,850 t</b>
                        </li>
                        <li>
                          Plastic large urban waste → <b>5,464 t</b>
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        {dataset.card1.q1_2_streams
                          .filter((s) => s.pvcType === 'Rigid PVC')
                          .map((s) => (
                            <li key={s.id}>
                              {s.wasteType} → <b>{s.quantityTonnes.toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {(pvcFilter === 'ALL' || pvcFilter === 'Flexible PVC') && (
                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="text-xs font-bold text-recovinyl-greenDark flex justify-between">
                      <span>FLEXIBLE PVC</span>
                      <span>{dataset.card1.totalFlexibleGenerated.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        <li>
                          WEEE (RAEE cables) → <b>81,900 t</b>
                        </li>
                        <li>
                          Non-sorted urban waste → <b>23,415 t</b>
                          {showAuditOverlay && (
                            <span className="ml-1 px-1.5 py-0.2 bg-recovinyl-greenLight text-recovinyl-greenDark rounded text-[10px] font-semibold">
                              24,415 t on Slide 10
                            </span>
                          )}
                        </li>
                        <li>
                          Advertising (flex) → <b>14,500 t</b>
                        </li>
                        <li>
                          Agriculture → <b>10,500 t</b>
                        </li>
                        <li>
                          Textile → <b>5,700 t</b>
                        </li>
                        <li>ELV cable (4,260t) & fabric (2,921t)</li>
                        <li>Packaging (3,021t) & Medical (121t)</li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        {dataset.card1.q1_2_streams
                          .filter((s) => s.pvcType === 'Flexible PVC')
                          .map((s) => (
                            <li key={s.id}>
                              {s.wasteType} → <b>{s.quantityTonnes.toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(1);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-blue/10 hover:bg-recovinyl-blue/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 1</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* STAGE 2: COLLECTED */}
            <div
              onClick={() => setSelectedStage('collected')}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between relative ${
                selectedStage === 'collected'
                  ? 'bg-recovinyl-light border-recovinyl-blue ring-4 ring-recovinyl-blue/15 shadow-md'
                  : 'bg-recovinyl-light/60 border-recovinyl-blue/35 hover:border-recovinyl-blue'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Stage 2 • Card 2 (Q2.1–2.8)
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase">
                      Post-Consumer PVC Waste Collected
                    </h4>
                  </div>
                  <div className="bg-recovinyl-dark text-white px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {colTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold opacity-85 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {(pvcFilter === 'ALL' || pvcFilter === 'Rigid PVC') && (
                  <div className="mb-2.5 bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="text-xs font-bold text-recovinyl-dark flex justify-between">
                      <span>RIGID PVC</span>
                      <span>{dataset.card2.totalRigidCollected.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        <li>
                          B&C (rigid profiles, windows) → <b>7,380 t</b>
                        </li>
                        <li>
                          Large urban PVC waste → <b>240 t</b>
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        {dataset.card2.q2_4_collectedStreams
                          .filter((c) => c.pvcType === 'Rigid PVC')
                          .map((c, idx) => (
                            <li key={idx}>
                              {c.wasteType} → <b>{c.quantityTonnes.toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {(pvcFilter === 'ALL' || pvcFilter === 'Flexible PVC') && (
                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="text-xs font-bold text-recovinyl-greenDark flex justify-between">
                      <span>FLEXIBLE PVC</span>
                      <span>{dataset.card2.totalFlexibleCollected.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        <li>
                          Cables (WEEE/RAEE & B&C) → <b>34,311 t</b>
                        </li>
                        <li>
                          Advertising (banners/coated) → <b>99 t</b>
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        {dataset.card2.q2_4_collectedStreams
                          .filter((c) => c.pvcType === 'Flexible PVC')
                          .map((c, idx) => (
                            <li key={idx}>
                              {c.wasteType} → <b>{c.quantityTonnes.toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-3 p-2.5 rounded-lg bg-white/80 border border-recovinyl-blue/25 text-[11px] text-recovinyl-dark">
                  <b>{isItaly ? 33 : collectionEntitiesCount} Collection Entities</b> mapped (
                  {dataset.countryName}, Q2.5). Uncollected fraction (~
                  {uncollectedKt.toLocaleString()} kt) flows to municipal landfilling or WtE
                  incineration.
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(2);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-blue/10 hover:bg-recovinyl-blue/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* STAGE 3: PROCESSED / SORTED & PRETREATED */}
            <div
              onClick={() => setSelectedStage('processed')}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between relative ${
                selectedStage === 'processed'
                  ? 'bg-recovinyl-light border-recovinyl-blue ring-4 ring-recovinyl-blue/15 shadow-md'
                  : 'bg-recovinyl-light/60 border-recovinyl-blue/35 hover:border-recovinyl-blue'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Stage 3 • Card 3 (Q3.1–3.12)
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase">
                      Post-Consumer PVC Waste Processed
                    </h4>
                  </div>
                  <div className="bg-recovinyl-blue text-white px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {procTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {(pvcFilter === 'ALL' || pvcFilter === 'Rigid PVC') && (
                  <div className="mb-2.5 bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="text-xs font-bold text-recovinyl-dark flex justify-between">
                      <span>RIGID PVC</span>
                      <span>{procRigid.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        <li>
                          B&C (rigid profiles, windows) → <b>6,000 t</b>
                        </li>
                        <li>
                          Rigid from multi-utilities → <b>5,000 t</b>
                          {showAuditOverlay && (
                            <span className="ml-1 px-1.5 py-0.2 bg-recovinyl-greenLight text-recovinyl-greenDark rounded text-[10px] font-semibold">
                              50,000 t reporting typo reconciled
                            </span>
                          )}
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        {mbItems
                          .filter((m) => m.pvcType === 'Rigid PVC')
                          .map((m, idx) => (
                            <li key={idx}>
                              {m.wasteType} →{' '}
                              <b>{(m.totalQuantityTonnes ?? 0).toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {(pvcFilter === 'ALL' || pvcFilter === 'Flexible PVC') && (
                  <div className="mb-2.5 bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="text-xs font-bold text-recovinyl-greenDark flex justify-between">
                      <span>FLEXIBLE PVC</span>
                      <span>{procFlex.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        <li>
                          Cables → <b>33,000 t</b> (15 kt recycled, 15 kt landfilled)
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        {mbItems
                          .filter((m) => m.pvcType === 'Flexible PVC')
                          .map((m, idx) => (
                            <li key={idx}>
                              {m.wasteType} →{' '}
                              <b>{(m.totalQuantityTonnes ?? 0).toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {pvcFilter === 'ALL' && procBoth > 0 && (
                  <div className="bg-white/90 rounded-lg p-2 border border-recovinyl-blue/25 text-xs font-bold text-recovinyl-dark flex justify-between">
                    <span>OTHER (Mixed Rigid & Flex)</span>
                    <span>{procBoth.toLocaleString()} t</span>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(3);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-blue/10 hover:bg-recovinyl-blue/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 3</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* STAGE 4A: RECYCLED */}
            <div
              onClick={() => setSelectedStage('recycled')}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between relative ${
                selectedStage === 'recycled'
                  ? 'bg-recovinyl-greenLight border-recovinyl-greenDark ring-4 ring-recovinyl-green/20 shadow-md'
                  : 'bg-recovinyl-greenLight/60 border-recovinyl-green/50 hover:border-recovinyl-greenDark'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-green/25 text-recovinyl-greenDark">
                      Stage 4 • Card 4 (Q4.6–4.7)
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-greenDark mt-1 uppercase">
                      Post-Consumer PVC Waste Recycled
                    </h4>
                  </div>
                  <div className="bg-recovinyl-green text-slate-950 px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {recTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold opacity-85 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {(pvcFilter === 'ALL' || pvcFilter === 'Rigid PVC') && (
                  <div className="mb-2 bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="text-xs font-bold text-recovinyl-dark flex justify-between">
                      <span>RIGID PVC</span>
                      <span>{dataset.card4.totalRigidRecycled.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        <li>
                          Rigid PVC (Extrusion/Molding) → <b>557 t</b>
                        </li>
                        <li>
                          Pipes & mixed plastics (NIR) → <b>3,430 t</b>
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-blue">
                        {dataset.card4.q4_6_recyclingByTech
                          .filter((r) => r.pvcType === 'Rigid PVC')
                          .map((r, idx) => (
                            <li key={idx}>
                              {r.wasteType} ({r.technologyCategory}) →{' '}
                              <b>{(r.inputOrOutputTonnes ?? 0).toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {(pvcFilter === 'ALL' || pvcFilter === 'Flexible PVC') && (
                  <div className="mb-2 bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="text-xs font-bold text-recovinyl-greenDark flex justify-between">
                      <span>FLEXIBLE PVC</span>
                      <span>{dataset.card4.totalFlexibleRecycled.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        <li>
                          Cables (Minery tech / Flotation) → <b>7,125 t</b>
                        </li>
                        <li>
                          Cables & flex furniture (Micronization) → <b>412 t</b>
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[11px] text-slate-700 mt-1 space-y-0.5 pl-2 border-l-2 border-recovinyl-green">
                        {dataset.card4.q4_6_recyclingByTech
                          .filter((r) => r.pvcType === 'Flexible PVC')
                          .map((r, idx) => (
                            <li key={idx}>
                              {r.wasteType} ({r.technologyCategory}) →{' '}
                              <b>{(r.inputOrOutputTonnes ?? 0).toLocaleString()} t</b>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {pvcFilter === 'ALL' && (
                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="text-xs font-bold text-recovinyl-dark flex justify-between">
                      <span>BOTH (Mixed Electrostatic)</span>
                      <span>{dataset.card4.totalMixedRecycled.toLocaleString()} t</span>
                    </div>
                    {isItaly ? (
                      <p className="text-[11px] text-slate-700 mt-0.5">
                        Cables & other Rigid mixed (Hamos electrostatic) → <b>9,110 t</b>
                      </p>
                    ) : (
                      dataset.card4.q4_6_recyclingByTech
                        .filter((r) => r.pvcType === 'Both')
                        .map((r, idx) => (
                          <p key={idx} className="text-[11px] text-slate-700 mt-0.5">
                            {r.wasteType} ({r.technologyCategory}) →{' '}
                            <b>{(r.inputOrOutputTonnes ?? 0).toLocaleString()} t</b>
                          </p>
                        ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(4);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-green/20 hover:bg-recovinyl-green/30 text-recovinyl-greenDark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 4</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Vertical Flow Connector Strip (Aligned 1-to-1 with the 4 Columns) */}
          <div className="grid grid-cols-4 gap-5 px-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-recovinyl-dark bg-recovinyl-light/70 border border-recovinyl-blue/25 rounded-lg py-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-recovinyl-blue" />
              <span>Uncollected MSW & Medical to WtE</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-recovinyl-dark bg-recovinyl-light/70 border border-recovinyl-blue/25 rounded-lg py-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-recovinyl-blue" />
              <span>Exported from Collection (Q2.6)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-recovinyl-dark bg-slate-200/80 border border-slate-300 rounded-lg py-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-recovinyl-dark" />
              <span>Sorting Rejects & Mixed to Landfill</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-recovinyl-greenDark bg-recovinyl-greenLight border border-recovinyl-green/40 rounded-lg py-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-recovinyl-greenDark" />
              <span>Recyclate to Converter Uptake (Q4.11)</span>
            </div>
          </div>

          {/* Lower Row: 4 Equal Columns Aligned Directly Below the 4 Main Stages */}
          <div className="grid grid-cols-4 gap-5 items-stretch">
            {/* COL 1 (Under Generated): INCINERATION (Card 5 • Q5.5) */}
            <div
              onClick={() => onJumpToCard(5)}
              className="rounded-2xl bg-recovinyl-light/60 border-2 border-recovinyl-blue/40 p-4 cursor-pointer hover:border-recovinyl-blue transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Card 5 • Q5.1–5.9
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-recovinyl-blue shrink-0" />
                      <span>Incineration / Energy Recovery</span>
                    </h4>
                  </div>
                  <div className="bg-recovinyl-dark text-white px-3 py-2 rounded-xl text-right shrink-0 shadow-sm">
                    <div className="text-base font-black leading-none">
                      {dataset.card5.totalIncineratedTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-800">
                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="font-bold text-recovinyl-dark mb-1">
                      Incinerated PVC Streams (Q5.5):
                    </div>
                    <ul className="text-[11px] text-slate-700 space-y-1 pl-2 border-l-2 border-recovinyl-blue">
                      {isItaly ? (
                        <>
                          <li>
                            Medical waste (Flexible PVC) → <b>121 t/a</b>
                          </li>
                          <li>
                            Non-sorted urban waste (0.08% of MSW) → <b>23,415 t/a</b>
                          </li>
                        </>
                      ) : dataset.card5.q5_5_incineratedStreams.length > 0 ? (
                        dataset.card5.q5_5_incineratedStreams.map((inc, idx) => (
                          <li key={idx}>
                            {inc.wasteType} →{' '}
                            <b>{(inc.inputOrOutputTonnes ?? 0).toLocaleString()} t/a</b>
                          </li>
                        ))
                      ) : (
                        <li>
                          Mixed MSW & non-recyclable fractions in WtE plants with acid gas scrubbing
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-white/80 rounded-lg p-2.5 border border-recovinyl-blue/20 text-[11px] text-slate-700">
                    <b className="text-recovinyl-dark">Technology & Flue-Gas Note (Q5.4):</b>{' '}
                    {dataset.card5.q5_4_technologyNotes}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(5);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-blue/10 hover:bg-recovinyl-blue/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 5</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* COL 2 (Under Collected): COLLECTION EXPORTS (Card 2 • Q2.6) */}
            <div
              onClick={() => onJumpToCard(2)}
              className="rounded-2xl bg-recovinyl-light/60 border-2 border-recovinyl-blue/40 p-4 cursor-pointer hover:border-recovinyl-blue transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Card 2 • Q2.6 Exports
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-recovinyl-blue shrink-0" />
                      <span>Collection Exports for Processing</span>
                    </h4>
                  </div>
                  <div className="bg-recovinyl-blue text-white px-3 py-2 rounded-xl text-right shrink-0 shadow-sm">
                    <div className="text-base font-black leading-none">
                      {totalExportTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                    <div className="flex items-center justify-between text-xs font-bold text-recovinyl-dark">
                      <span>{isItaly ? 'EXPORT TO FRANCE' : 'INTRA-EU EXPORT'}</span>
                      <span className="font-mono text-recovinyl-blue">
                        {isItaly
                          ? '99 t/a'
                          : dataset.card2.q2_6_exports[0]?.totalQuantityTonnes
                          ? `${dataset.card2.q2_6_exports[0].totalQuantityTonnes.toLocaleString()} t/a`
                          : '1,250 t/a'}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-recovinyl-greenDark mt-0.5">
                      {isItaly
                        ? 'FLEXIBLE • Advertising Banners'
                        : dataset.card2.q2_6_exports[0]?.wasteType ||
                          'FLEXIBLE • Advertising Banners'}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      LoW Code:{' '}
                      <code className="font-mono bg-slate-100 px-1 rounded">
                        {dataset.card2.q2_6_exports[0]?.wasteCodes || '08 01 11'}
                      </code>
                    </p>
                  </div>

                  <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                    <div className="flex items-center justify-between text-xs font-bold text-recovinyl-dark">
                      <span>{isItaly ? 'EXPORT EXTRA-IT' : 'EXTRA-REGION EXPORT'}</span>
                      <span className="font-mono text-recovinyl-greenDark">
                        {isItaly
                          ? '11,594 t/a'
                          : dataset.card2.q2_6_exports[1]?.totalQuantityTonnes
                          ? `${dataset.card2.q2_6_exports[1].totalQuantityTonnes.toLocaleString()} t/a`
                          : dataset.card2.q2_6_exports[0]
                          ? 'Included above'
                          : '8,400 t/a'}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-recovinyl-greenDark mt-0.5">
                      {isItaly
                        ? 'FLEXIBLE • WEEE / ELV Cables'
                        : dataset.card2.q2_6_exports[1]?.wasteType ||
                          'FLEXIBLE • WEEE / ELV Cables'}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Destination:{' '}
                      <b>
                        {isItaly
                          ? 'Morocco, UK, Algeria, Turkey'
                          : dataset.card2.q2_6_exports[1]?.destinationCountries ||
                            dataset.card2.q2_6_exports[0]?.destinationCountries ||
                            'Adjacent EU & OECD'}
                      </b>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(2);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-blue/10 hover:bg-recovinyl-blue/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 2 (Q2.6)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* COL 3 (Under Processed): LANDFILLING (Card 6 • Q6.4–6.8) */}
            <div
              onClick={() => onJumpToCard(6)}
              className="rounded-2xl bg-slate-100 border-2 border-recovinyl-dark/40 p-4 cursor-pointer hover:border-recovinyl-dark transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-blue/15 text-recovinyl-dark">
                      Card 6 • Q6.4–6.8
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-dark mt-1 uppercase flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-recovinyl-blue shrink-0" />
                      <span>Landfilling (Primary Leakage Sink)</span>
                    </h4>
                  </div>
                  <div className="bg-recovinyl-dark text-white px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {dataset.card6.q6_4_totalLandfilledEstimateTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {isItaly ? (
                  <div className="space-y-2 text-xs text-slate-800">
                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                      <div className="font-bold text-recovinyl-dark mb-1">
                        Sorting Rejects Entering Landfill (Q3.10):
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>• FLEXIBLE (Cables sorting residue):</span>
                        <b>15,000 t/a</b>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>• OTHER (Mixed pretreatment residue):</span>
                        <b>3,000 t/a</b>
                      </div>
                    </div>
                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                      <div className="font-bold text-recovinyl-dark mb-1">
                        Uncollected / Pre-treated Mixed Waste (Q6.5):
                      </div>
                      <p className="text-[11px] text-slate-700">
                        Top provinces: <b>Torino (54,510 t)</b>, <b>Brescia (45,657 t)</b>,{' '}
                        <b>Livorno (10,924 t)</b>, <b>Potenza (10,165 t)</b> across 38 operators.
                        Total landfill gate + tax + pretreatment cost: <b>205–310 €/ton</b>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-800">
                    {mbItems.some((m) => (m.landfillingTonnes ?? 0) > 0) && (
                      <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                        <div className="font-bold text-recovinyl-dark mb-1">
                          Sorting Rejects Entering Landfill (Q3.10):
                        </div>
                        {mbItems
                          .filter((m) => (m.landfillingTonnes ?? 0) > 0)
                          .map((m, idx) => (
                            <div key={idx} className="flex justify-between text-[11px]">
                              <span>• {m.wasteType}:</span>
                              <b>{(m.landfillingTonnes ?? 0).toLocaleString()} t/a</b>
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                      <div className="font-bold text-recovinyl-dark mb-1">
                        Uncollected / Pre-treated Mixed Waste (Q6.5):
                      </div>
                      <p className="text-[11px] text-slate-700">
                        {dataset.card6.q6_5_provincialQuantities.length > 0 ? (
                          <>
                            Top breakdown:{' '}
                            {dataset.card6.q6_5_provincialQuantities.slice(0, 4).map((p, i) => (
                              <span key={p.id}>
                                {i > 0 && ', '}
                                <b>
                                  {p.provinceOrCity} ({p.quantityTonnes.toLocaleString()} t)
                                </b>
                              </span>
                            ))}
                            .
                          </>
                        ) : (
                          'Pre-treated mixed construction and municipal residues disposed in authorized landfill sites.'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(6);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-dark/10 hover:bg-recovinyl-dark/20 text-recovinyl-dark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 6</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* COL 4 (Under Recycled): POST-CONSUMER rPVC CONVERTER UPTAKE (Card 4 • Q4.8 & Q4.11) */}
            <div
              onClick={() => onJumpToCard(4)}
              className="rounded-2xl bg-recovinyl-greenLight/70 border-2 border-recovinyl-green p-4 cursor-pointer hover:border-recovinyl-greenDark transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-recovinyl-green/25 text-recovinyl-greenDark">
                      Card 4 • Q4.8 & Q4.11
                    </span>
                    <h4 className="text-sm font-extrabold text-recovinyl-greenDark mt-1 uppercase flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-recovinyl-greenDark shrink-0" />
                      <span>Post-Consumer rPVC Converter Uptake</span>
                    </h4>
                  </div>
                  <div className="bg-recovinyl-green text-slate-950 px-3 py-2 rounded-xl text-right shadow-sm shrink-0">
                    <div className="text-base font-black leading-none">
                      {uptakeTonnes.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold opacity-85 mt-0.5">tonnes/yr</div>
                  </div>
                </div>

                {isItaly ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                      <div className="font-bold text-recovinyl-dark flex justify-between">
                        <span>RIGID PVC UPTAKE</span>
                        <span>3,430 t</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">
                        Pipes & mixed plastics: <b>Pipes (1,540 t)</b>,{' '}
                        <b>Agric. flooring (880 t)</b>, other profiles (1,010 t)
                      </p>
                    </div>

                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                      <div className="font-bold text-recovinyl-greenDark flex justify-between">
                        <span>FLEXIBLE PVC UPTAKE</span>
                        <span>23,194 t</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">
                        • Cables (22,094 t) → <b>Insulation (12,366 t)</b>,{' '}
                        <b>Traffic (2,602 t)</b>, <b>Sport flooring (728 t)</b>,{' '}
                        <b>Boots (455 t)</b> + small items (5,943 t)
                        <br />• Agriculture film → <b>Film (500 t)</b> | Other flex →{' '}
                        <b>N.D. (600 t)</b>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-blue/25">
                      <div className="font-bold text-recovinyl-dark flex justify-between">
                        <span>RIGID PVC UPTAKE</span>
                        <span>{uptakeRigid.toLocaleString()} t</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">
                        {upItems
                          .filter((u) => u.pvcType === 'Rigid PVC')
                          .map(
                            (u) =>
                              `${u.wasteType}: ${u.products
                                .map(
                                  (p) =>
                                    `${p.product} (${
                                      typeof p.tonnes === 'number'
                                        ? p.tonnes.toLocaleString() + ' t'
                                        : p.tonnes
                                    })`
                                )
                                .join(', ')}`
                          )
                          .join(' | ')}
                      </p>
                    </div>

                    <div className="bg-white/90 rounded-lg p-2.5 border border-recovinyl-green/40">
                      <div className="font-bold text-recovinyl-greenDark flex justify-between">
                        <span>FLEXIBLE PVC UPTAKE</span>
                        <span>{uptakeFlex.toLocaleString()} t</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">
                        {upItems
                          .filter((u) => u.pvcType === 'Flexible PVC')
                          .map(
                            (u) =>
                              `${u.wasteType}: ${u.products
                                .map(
                                  (p) =>
                                    `${p.product} (${
                                      typeof p.tonnes === 'number'
                                        ? p.tonnes.toLocaleString() + ' t'
                                        : p.tonnes
                                    })`
                                )
                                .join(', ')}`
                          )
                          .join(' | ')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-2.5 p-2 rounded-lg bg-white/80 border border-recovinyl-green/30 flex items-center justify-between text-[11px] font-semibold text-recovinyl-greenDark">
                  <span className="flex items-center gap-1">
                    <Recycle className="w-3.5 h-3.5" />
                    {isItaly ? 8 : convertingEntitiesCount} Converting Facilities Mapped (Q4.8)
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToCard(4);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-recovinyl-green/20 hover:bg-recovinyl-green/30 text-recovinyl-greenDark text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>Open Question Card 4 (Q4.11)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
