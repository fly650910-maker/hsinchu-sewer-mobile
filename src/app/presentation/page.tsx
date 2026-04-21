'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Home, Users, Landmark, Wrench, 
  Database, ShieldAlert, Lightbulb, PieChart, CheckCircle2, 
  MapPin, AlertTriangle, FileText, BarChart3, HelpCircle
} from 'lucide-react';
import Link from 'next/link';

// Slide Data (Derived from PPTX extraction)
interface Metric { label: string; value: string; unit: string; color?: string; }
const SLIDES = [
  {
    index: 1,
    section: "Intro",
    title: "114年度雨水下水道系統維護管理 年度訪評",
    subtitle: "受評單位：新竹縣政府",
    footer: "報告人：雨水下水道承辦人 | 115 年 3 月 24 日",
    icon: <Landmark className="w-16 h-16 text-sky-400" />
  },
  {
    index: 2,
    section: "現況",
    title: "本縣雨水下水道建設情形",
    metrics: [
      { label: "行政區域面積", value: "85,493", unit: "公頃" },
      { label: "都市計畫面積", value: "5,363", unit: "公頃" },
      { label: "總規劃面積", value: "4,299", unit: "公頃" },
      { label: "規劃總長度", value: "157.42", unit: "公里" },
      { label: "建設總長度", value: "115.57", unit: "公里" },
      { label: "工程實施率", value: "73.42", unit: "%", color: "text-sky-400" }
    ],
    icon: <BarChart3 className="w-12 h-12" />
  },
  {
    index: 3,
    section: "現況",
    title: "本縣雨水下水道建設情形 (續)",
    content: "詳細行政區劃分與分佈圖 (請參閱附件)",
    icon: <MapPin className="w-12 h-12" />
  },
  {
    index: 4,
    section: "大綱",
    title: "簡報大綱",
    list: [
      "一、組織人力", "二、預算編列", "三、下水道維護管理", 
      "四、資料庫業務", "五、防汛措施", "六、前次意見處理", "七、創新作為"
    ],
    icon: <PieChart className="w-12 h-12" />
  },
  {
    index: 5,
    section: "一、組織人力",
    title: "1-1-1 專責單位列表",
    subtitle: "工務處下水道科 及 各鄉鎮公所建設/工務課",
    list: [
      "工務處下水道科", "竹北市公所工務課", "竹東鎮公所建設課", 
      "湖口鄉公所工務課", "新豐鄉公所建設課", "新埔鎮公所建設課",
      "關西鎮公所建設課", "芎林鄉公所建設課", "橫山鄉公所建設課",
      "北埔鄉公所建設課", "寶山鄉公所工務課", "五峰鄉公所建設課"
    ],
    badge: "自評 5/5 | 附件 1-1-1",
    icon: <Users className="w-12 h-12" />
  },
  {
    index: 6,
    section: "一、組織人力",
    title: "1-1-2 專責人員配置",
    subtitle: "全縣合計 24 人（含各公所課長、主辦人員）",
    table: [
      ["單位", "人員", "單位", "人員"],
      ["工務處", "王俊堯/劉致宏", "竹北市", "蔡坤志/王靖"],
      ["竹東鎮", "陳明靖/吳韵茹", "湖口鄉", "吳昕儒/林亮方"],
      ["新豐鄉", "温勝棠/賴亭蓁", "新埔鎮", "林文竹/林文竹"],
      ["關西鎮", "陳學璡/陳建銘", "芎林鄉", "張學群/林同心"],
      ["寶山鄉", "林政勳/劉宥彤", "北埔鄉", "謝仕豪/甘雅雯"]
    ],
    badge: "自評 5/5 | 附件 1-1-2",
    icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />
  },
  {
    index: 7,
    section: "二、預算編列",
    title: "1-2-1 清淤預算編列",
    content: "115年新竹縣編列經費合計：",
    highlight: "4,228 萬 5,000 元",
    badge: "自評 5/5 | 附件 1-2-1",
    icon: <Landmark className="w-12 h-12" />
  },
  {
    index: 8,
    section: "三、維護管理",
    title: "1-3-1 排水系統定期清淤",
    list: [
      "本府定期派員辦理開孔檢查",
      "即時掌握淤積狀況並派工清淤",
      "各公所針對轄管設施同步執行"
    ],
    photoLabel: "新豐鄉新興路 (C幹線) 清淤實錄",
    badge: "自評 9.9/10 | 附件 1-3-1",
    icon: <Wrench className="w-12 h-12" />
  },
  {
    index: 9,
    section: "三、維護管理",
    title: "1-3-2 交通維持與職業安全",
    content: "清淤作業人員依規穿著背心、安全帽，並妥置交通設施。",
    list: ["穿著完整防護裝備", "交通引導與警示標示"],
    badge: "自評 6/6 | 附件 1-3-2",
    icon: <ShieldAlert className="w-12 h-12" />
  },
  {
    index: 10,
    section: "三、維護管理",
    title: "1-3-2 安全管理計畫書",
    content: "完整備查文件：",
    list: ["職業安全衛生管理計畫書", "交通維持計畫書 (含緊急應變)"],
    badge: "自評 6/6 | 附件 1-3-2",
    icon: <FileText className="w-12 h-12" />
  },
  {
    index: 11,
    section: "三、維護管理",
    title: "1-3-3 清淤管渠紀錄實務",
    list: [
      "每季或不定期巡檢",
      "分署每月抽查鄉鎮淤積狀況",
      "嚴格督導改善成效"
    ],
    photoLabel: "新埔廣和街、湖口中山路巡檢實況",
    badge: "自評 6/6 | 附件 1-3-3",
    icon: <CheckCircle2 className="w-12 h-12" />
  },
  {
    index: 12,
    section: "三、維護管理",
    title: "1-3-3 抽查紀錄表冊",
    metrics: [
      { label: "114年度抽查總數", value: "60", unit: "處" },
      { label: "輕微淤積 (已處置)", value: "12", unit: "處" },
      { label: "排水優良率", value: "80", unit: "%" }
    ],
    badge: "自評 6/6 | 附件 1-3-3",
    icon: <FileText className="w-12 h-12" />
  },
  {
    index: 13,
    section: "三、維護管理",
    title: "1-3-3 年度清淤成果統計",
    metrics: [
      { label: "清淤總長度", value: "4,042", unit: "m" },
      { label: "清淤總土量", value: "388", unit: "m³" }
    ],
    footer: "115年度同步啟動新豐C幹線清淤派工",
    badge: "自評 5/5",
    icon: <BarChart3 className="w-12 h-12" />
  },
  {
    index: 14,
    section: "三、維護管理",
    title: "1-3-4 施工應變作為",
    content: "本府 114 年度在建工程「雨水下水道工程設施 (開口契約)」：",
    list: [
      "已核定防汛計畫書",
      "具備職業安全衛生管理計畫 (含緊急應變)",
      "依規執行安全維護，避免釀成災害"
    ],
    badge: "自評 8/8",
    icon: <ShieldAlert className="w-12 h-12" />
  },
  {
    index: 15,
    section: "三、維護管理",
    title: "1-3-5 清淤計畫與發包",
    list: [
      "115年度清淤預計長度：5,200 公尺 (含聯通管)",
      "於 114.04.09 完成清淤計畫修正報部",
      "114年開口契約同步執行中"
    ],
    badge: "自評 0.1/0.1",
    icon: <BarChart3 className="w-12 h-12" />
  },
  {
    index: 16,
    section: "三、維護管理",
    title: "1-3-6 管線附掛巡檢",
    list: [
      "結合平時清淤作業同步巡查",
      "清查有無管線穿越或不當附掛",
      "發現異常即通報管理機關要求改善"
    ],
    badge: "自評 5/5",
    icon: <AlertTriangle className="w-12 h-12" />
  },
  {
    index: 17,
    section: "四、資料庫業務",
    title: "1-4-1 系統圖資掌握度",
    metrics: [
      { label: "數化比例", value: "100", unit: "%" },
      { label: "數化總長度", value: "115,700", unit: "m" }
    ],
    content: "全數完成內政部國土署匯入作業。",
    badge: "自評 5/5",
    icon: <Database className="w-12 h-12" />
  },
  {
    index: 18,
    section: "四、資料庫業務",
    title: "1-4-1 維護管理 E 化",
    content: "掌握設施紀錄，落實維護數位化流程。",
    icon: <Database className="w-12 h-12 text-blue-400" />
  },
  {
    index: 19,
    section: "四、資料庫業務",
    title: "1-4-2 圖資更新現況",
    subtitle: "專業團隊協力管理",
    list: [
      "縣府專責人員：2 人",
      "鄉鎮專責人員：22 人",
      "技術顧問：山水技術顧問",
      "資訊維護：多維有限公司"
    ],
    badge: "自評 5/5",
    icon: <Users className="w-12 h-12" />
  },
  {
    index: 20,
    section: "四、資料庫業務",
    title: "1-4-3 圖資應用實務",
    content: "透過 GIS 平台進行數據視覺化比對與分析。",
    list: [
      "預留資料加載空間",
      "依時間軸分類收納歷次調查",
      "115年4月預計辦理鄉鎮教育訓練"
    ],
    badge: "自評 5/5",
    icon: <MapPin className="w-12 h-12 text-rose-400" />
  },
  {
    index: 21,
    section: "五、防汛措施",
    title: "1-5-1 防汛講習與演練",
    photoLabel: "114-115年度防汛演練實況",
    content: "定期辦理教育訓練，提升現場應變戰力。",
    badge: "自評 5/5",
    icon: <CheckCircle2 className="w-12 h-12" />
  },
  {
    index: 22,
    section: "五、防汛措施",
    title: "1-5-1 安全配備清單",
    list: [
      "✅ 安全帽 / 反光背心 / 頭燈",
      "✅ 背負式安全帶 / 對講機",
      "✅ 安全警報器 / 氣體偵測器"
    ],
    badge: "自評 5/5",
    icon: <ShieldAlert className="w-12 h-12 text-orange-400" />
  },
  {
    index: 23,
    section: "五、防汛措施",
    title: "1-5-2 防汛作業流程",
    subtitle: "新竹縣災害蒐集及通報計畫",
    content: "健全各鄉鎮災情查報通報體系，標準化 SOP 操作。",
    badge: "自評 2/2",
    icon: <CheckCircle2 className="w-12 h-12" />
  },
  {
    index: 24,
    section: "五、防汛措施",
    title: "1-5-3 災情通報聯絡清冊",
    content: "完整建置縣府及各鄉鎮公所防災體系人員名冊。",
    badge: "自評 3/3",
    icon: <Users className="w-12 h-12" />
  },
  {
    index: 25,
    section: "五、防汛措施",
    title: "1-5-4 EMIC 作業熟悉度",
    content: "113年共辦理 7 場 EMIC 2.0 教育訓練。",
    list: ["應變管理資訊系統 2.0", "救災資源資料庫實作"],
    badge: "自評 2/2",
    icon: <Landmark className="w-12 h-12" />
  },
  {
    index: 26,
    section: "五、防汛措施",
    title: "1-5-5 & 1-5-6 系統報部實務",
    list: [
      "豪大雨期間透過簡訊/電話/傳真回報署端",
      "114年度都市計畫區無積淹水情事",
      "即時填報 EMIC 處置報告欄"
    ],
    badge: "自評 10/10",
    icon: <CheckCircle2 className="w-12 h-12" />
  },
  {
    index: 27,
    section: "六、前次意見處理",
    title: "前次訪評意見處理情形",
    subtitle: "落實改善，持續進步",
    list: [
      "纜線管理辦法：已移請行政處辦理發布作業",
      "管理模式：未來朝向全資訊化管理 (E化)",
      "基層協調：加強與公所分工與支援"
    ],
    badge: "自評 4/4",
    icon: <BarChart3 className="w-12 h-12" />
  },
  {
    index: 28,
    section: "七、創新作為",
    title: "1-7-1 創新與 AI 應用",
    content: "導入 AI 下水道影像辨識與自動化設施監測。",
    list: [
      "逐步建立大數據資料庫",
      "整合 GIS 視覺化呈現決策資訊",
      "提升災害應變速度與準確性"
    ],
    icon: <Lightbulb className="w-12 h-12 text-amber-400" />
  },
  {
    index: 29,
    section: "結語",
    title: "簡報完畢",
    subtitle: "敬請各位委員指教",
    icon: <Landmark className="w-24 h-24 text-sky-400" />
  },
  { index: 30, section: "附錄", title: "實地訪評 - 現地人孔檢視點位", icon: <MapPin className="w-12 h-12" /> },
  { index: 31, section: "附錄", title: "一、 組織人力 (2/3) - 職掌表", icon: <Users className="w-12 h-12" /> },
  { index: 32, section: "附錄", title: "一、 組織人力 (3/3) - 公所一覽表", icon: <Users className="w-12 h-12" /> },
  { index: 33, section: "附錄", title: "五、 防汛措施 (2/7) - 首長巡檢", icon: <Users className="w-12 h-12" /> },
  { index: 34, section: "附錄", title: "五、 防汛措施 (3/7) - 汛期前清淤", icon: <CheckCircle2 className="w-12 h-12" /> },
  { index: 35, section: "附錄", title: "五、 防汛措施 (5/7) - 聯絡名冊抽測", icon: <ShieldAlert className="w-12 h-12" /> },
  { index: 36, section: "附錄", title: "災情查報 APP 專題", subtitle: "即時通報、GPS 定位、照片上傳", icon: <Database className="w-12 h-12" /> },
  // Remaining pages 37-47 are "Previous Opinions Handling" details
  ...Array.from({ length: 11 }, (_, i) => ({
    index: 37 + i,
    section: "附錄",
    title: "六、 前次意見處理情形 (" + (i+2) + "/12)",
    icon: <HelpCircle className="w-12 h-12" />
  }))
];

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [currentSlide]);

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, SLIDES.length - 1));
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  if (!mounted) return null;

  const currentData = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* ProgressBar */}
      <div className="h-1.5 w-full bg-slate-800">
        <div 
          className="h-full bg-sky-500 transition-all duration-300 ease-out"
          style={{ width: `${((currentSlide + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      {/* Main Slide Content */}
      <main className="flex-1 relative flex items-center justify-center p-8 md:p-16">
        <div className="max-w-6xl w-full h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex items-start gap-4 mb-4">
             <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                {currentData.icon}
             </div>
             <div>
                <span className="text-sky-500 font-bold tracking-widest text-sm uppercase mb-1 block">
                    {currentData.section} | PAGE {currentData.index}
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white mb-6">
                    {currentData.title}
                </h1>
                {currentData.subtitle && (
                    <h2 className="text-2xl text-slate-400 mb-8 font-medium">
                        {currentData.subtitle}
                    </h2>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4 items-center">
            <div className="space-y-8">
               {currentData.content && (
                  <p className="text-xl text-slate-300 leading-relaxed italic border-l-4 border-sky-500 pl-6 py-2">
                    {currentData.content}
                  </p>
               )}

               {currentData.highlight && (
                  <div className="text-6xl md:text-8xl font-black text-sky-400 drop-shadow-2xl">
                    {currentData.highlight}
                  </div>
               )}

               {currentData.list && (
                  <ul className="space-y-4">
                    {currentData.list.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-lg md:text-xl text-slate-300">
                        <CheckCircle2 className="w-6 h-6 text-sky-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
               )}

               {currentData.metrics && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {(currentData.metrics as Metric[]).map((m, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-500 transition-colors">
                        <div className="text-slate-400 text-sm font-semibold mb-2">{m.label}</div>
                        <div className={`text-3xl font-bold ${m.color || 'text-white'}`}>
                          {m.value} <span className="text-sm font-normal text-slate-500">{m.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
               )}
            </div>

            {/* Visual Panel (Right side) */}
            <div className="flex flex-col items-center justify-center p-8 rounded-[40px] bg-sky-500/5 border border-sky-500/10 shadow-inner">
               {currentData.index === 1 ? (
                  <div className="text-center animate-pulse">
                    <div className="w-48 h-48 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-sky-500/30">
                        <Landmark className="w-24 h-24 text-sky-400" />
                    </div>
                    <div className="text-slate-500 font-mono tracking-tighter">SINCE 114 INSPECTION</div>
                  </div>
               ) : currentData.table ? (
                  <div className="w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50">
                                <th className="p-3 text-slate-400 text-xs uppercase font-bold">區域 / 人員</th>
                                <th className="p-3 text-slate-400 text-xs uppercase font-bold">區域 / 人員</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.table.map((row, i) => (
                                <tr key={i} className="border-t border-white/5">
                                    <td className="p-3 text-sm border-r border-white/5">{row[0]} - <span className="text-sky-400">{row[1]}</span></td>
                                    <td className="p-3 text-sm">{row[2]} - <span className="text-sky-400">{row[3]}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
               ) : (
                  <div className="w-full aspect-video bg-slate-900/50 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-600 border-2 border-dashed border-white/5">
                    <MapPin className="w-12 h-12 opacity-20" />
                    <span className="text-sm font-medium">{currentData.photoLabel || "現場紀實影像 / 附件資料照片"}</span>
                    <span className="text-xs opacity-50 px-8 text-center">(按此預留位，請使用者依評核區域替換實際勘查照片)</span>
                  </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="h-24 bg-slate-900/50 border-t border-white/5 flex items-center justify-between px-12 z-10 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Link href="/">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold text-slate-400 hover:text-white">
              <Home size={18} /> 返回儀表板
            </button>
          </Link>
          <div className="text-slate-500 text-sm font-mono tracking-widest uppercase">
            {currentData.footer || "新竹縣雨水下水道訪評簡報系統"}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-2xl">
          <button 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-3 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronLeft />
          </button>
          <div className="px-6 text-xl font-black text-white border-x border-white/10">
            {currentSlide + 1} <span className="text-slate-500 text-sm font-normal">/ {SLIDES.length}</span>
          </div>
          <button 
            onClick={nextSlide}
            disabled={currentSlide === SLIDES.length - 1}
            className="p-3 rounded-xl hover:bg-sky-500 bg-sky-500/10 text-sky-400 hover:text-white transition-all shadow-lg shadow-sky-500/20"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1.5">
           {currentData.badge && (
              <span className="px-4 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-xs font-bold uppercase tracking-widest shadow-inner">
                {currentData.badge}
              </span>
           )}
        </div>
      </footer>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[40rem] h-[40rem] bg-sky-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>
    </div>
  );
}
