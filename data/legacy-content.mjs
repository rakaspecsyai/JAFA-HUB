export const checkedDate = "21 Oktober 2026";
export const sources = {
  bkn3: "https://jdih.bkn.go.id/Detail_peraturan/breaking/2568",
  bknPdf: "https://dispakati.bkn.go.id/assets/download/new/perban_3_2023.pdf",
  pmk132: "https://jdih.kemenkeu.go.id/dok/pmk-132-tahun-2023",
  pmk44: "https://jdih.kemenkeu.go.id/dok/pmk-44-tahun-2023",
  pmk124: "https://jdih.kemenkeu.go.id/dok/pmk-124-tahun-2023",
  pmk196: "https://jdih.kemenkeu.go.id/dok/196-pmk-06-2017",
  panrb11: "https://peraturan.bpk.go.id/Details/266066/permen-panrb-no-11-tahun-2023",
  makassar: "https://www.djkn.kemenkeu.go.id/kanwil-sulseltrabar/baca-berita/41965/DJKN-Dorong-Pemda-Jadikan-Jabatan-Fungsional-Penilai-dan-Penata-Laksana-Barang-untuk-Optimalkan-Pengelolaan-Aset-Daerah.html",
  lampung: "https://www.djkn.kemenkeu.go.id/kanwil-lampungbengkulu/baca-berita/40480/Sosialisasi-JFPP-dan-JFPLB-serta-Peningkatan-Kapasitas-SDM-Penilai-di-Instansi-Pemerintah-Daerah.html",
  bali: "https://www.djkn.kemenkeu.go.id/kanwil-balinusra/baca-berita/42575/Perkuat-Kompetensi-dan-Apresiasi-Kinerja-Kanwil-DJKN-Balinusra-Gelar-Uji-Kompetensi-Pelelang-dan-Lelang-Award-2026.html"
};

export const regulations = [
  {id:"pmk132", code:"PMK 132 Tahun 2023", title:"Petunjuk Pelaksanaan dan Petunjuk Teknis Jabatan Fungsional di Bidang Keuangan Negara", issuer:"Kementerian Keuangan", tags:["pp","plb","pelelang"], description:"Rujukan pelaksanaan, pembinaan, pengelolaan kinerja, dan ketentuan peralihan JF bidang keuangan negara."},
  {id:"bkn3", code:"Peraturan BKN 3 Tahun 2023", title:"Angka Kredit, Kenaikan Pangkat dan Jenjang Jabatan Fungsional", issuer:"Badan Kepegawaian Negara", tags:["pp","plb","pelelang"], description:"Dasar konversi predikat kinerja menjadi Angka Kredit, termasuk perhitungan tahunan dan proporsional."},
  {id:"pmk44", code:"PMK 44 Tahun 2023", title:"Standar, Uji, dan Pengembangan Kompetensi Jabatan Fungsional Penata Laksana Barang", issuer:"Kementerian Keuangan", tags:["plb"], description:"Rujukan kompetensi teknis, manajerial, sosial kultural, serta pengembangan kompetensi JFPLB."},
  {id:"pmk124", code:"PMK 124 Tahun 2023", title:"Pejabat Lelang Kelas I", issuer:"Kementerian Keuangan", tags:["pelelang"], description:"Ketentuan mengenai Pejabat Lelang Kelas I, tugas dan kewenangan, serta pembinaan profesinya."},
  {id:"pmk196", code:"PMK 196/PMK.06/2017", title:"Standar Kompetensi dan Pelaksanaan Uji Kompetensi Jabatan Fungsional Pelelang", issuer:"Kementerian Keuangan", tags:["pelelang"], description:"Referensi standar dan pelaksanaan uji kompetensi JF Pelelang. Baca bersama aturan JF yang lebih baru."},
  {id:"panrb11", code:"PermenPANRB 11 Tahun 2023", title:"Jabatan Fungsional di Bidang Keuangan Negara", issuer:"Kementerian PANRB", tags:["pp","plb","pelelang"], description:"Kerangka jabatan, kategori, jenjang, dan pembinaan JF di bidang keuangan negara."}
].map(item => ({...item, url:sources[item.id], checked:checkedDate}));

export const professions = [
  {
    id:"pp",slug:"penilai-pemerintah",short:"JF PP",name:"Penilai Pemerintah",nav:"JF Penilai Pemerintah",icon:"scales",image:"field.webp",
    theme:"Penilaian yang dapat dipertanggungjawabkan.",
    intro:"Kenali peran penilaian properti, bisnis, dan sumber daya alam dalam mendukung pengelolaan kekayaan negara.",
    definition:"Dalam materi pembinaan DJKN, Penilai Pemerintah melaksanakan kegiatan penilaian untuk menghasilkan opini nilai atas suatu objek pada waktu tertentu. Hasilnya membantu pengambilan keputusan pengelolaan aset negara dan daerah.",
    category:"Keahlian",grades:["Ahli Pertama","Ahli Muda","Ahli Madya","Ahli Utama"],
    tasks:["Mengidentifikasi objek dan kebutuhan data penilaian.","Melaksanakan survei serta memeriksa data pembanding.","Menganalisis data dan menyusun laporan penilaian.","Mendukung kendali mutu dan kajian teknis penilaian."],
    competence:["Penilaian properti, bisnis, dan sumber daya alam","Analisis data serta penyusunan laporan","Integritas, komunikasi, dan pengelolaan hubungan kerja"],
    nomenclature:"PMK 132 Tahun 2023 menggunakan nomenklatur JF Penilai dan mengatur penyesuaian dari JF Penilai Pemerintah. Istilah JF PP digunakan di sini untuk memudahkan penelusuran materi pembinaan DJKN.",
    faq:[
      {q:"Apa ruang lingkup Penilai Pemerintah?",a:"Materi pembinaan DJKN mencakup penilaian properti, bisnis, dan sumber daya alam. Cakupan penugasan konkret mengikuti jenjang, bidang tugas, dan ketentuan instansi pembina."},
      {q:"Apakah istilah JF PP sama dengan JF Penilai?",a:"PMK 132 Tahun 2023 memuat nomenklatur JF Penilai dan ketentuan penyesuaian dari JF Penilai Pemerintah. Gunakan nama pada keputusan jabatan dan periksa ketentuan peralihannya."},
      {q:"Bagaimana memperoleh Angka Kredit?",a:"Predikat kinerja dapat dikonversi menjadi Angka Kredit menurut koefisien jenjang dan periode penilaian. Coba simulator untuk memahami konversi dasarnya."}
    ]
  },
  {
    id:"plb",slug:"penata-laksana-barang",short:"JF PLB",name:"Penata Laksana Barang",nav:"JF Penata Laksana Barang",icon:"buildings",image:"hero.webp",
    theme:"Pengelolaan aset yang tertib dan akuntabel.",
    intro:"Pahami peran pengelolaan Barang Milik Negara dan Daerah, dari perencanaan kebutuhan hingga pengawasan.",
    definition:"Penata Laksana Barang memiliki ruang lingkup kegiatan pengelolaan BMN/D. Perannya mendukung ketertiban pencatatan, penggunaan, pengamanan, dan pengelolaan barang sesuai ketentuan.",
    category:"Keterampilan",grades:["Terampil","Mahir","Penyelia"],
    tasks:["Mendukung perencanaan kebutuhan dan penggunaan BMN/D.","Melakukan penatausahaan, inventarisasi, dan pelaporan.","Mendukung pengamanan, pemeliharaan, serta pemanfaatan aset.","Mendukung pengawasan dan pengendalian pengelolaan barang."],
    competence:["Pengelolaan dan penatausahaan BMN/D","Kualitas data, inventarisasi, dan pelaporan aset","Kompetensi manajerial dan sosial kultural"],
    nomenclature:"PMK 44 Tahun 2023 menjadi rujukan kompetensi JFPLB kategori keterampilan. PMK 132 Tahun 2023 juga memuat penyesuaian nomenklatur JFPLB dalam JF PKN. Baca ketentuan peralihan dan keputusan jabatan yang berlaku di instansi Anda.",
    faq:[
      {q:"Apa yang dimaksud dengan BMN/D?",a:"BMN/D adalah Barang Milik Negara/Daerah. Pengelolaannya mencakup kebutuhan, penggunaan, pemanfaatan, pengamanan, pemeliharaan, penatausahaan, dan kegiatan lain sesuai aturan."},
      {q:"Apa jenjang JFPLB dalam PMK 44 Tahun 2023?",a:"PMK 44 Tahun 2023 menyebut kategori keterampilan dengan jenjang Terampil, Mahir, dan Penyelia. Periksa pula ketentuan penyesuaian dalam PMK 132 Tahun 2023."},
      {q:"Apa rujukan uji kompetensi JFPLB?",a:"Mulai dari PMK 44 Tahun 2023 tentang Standar, Uji, dan Pengembangan Kompetensi JF Penata Laksana Barang, lalu cocokkan dengan informasi penyelenggaraan dari instansi pembina."}
    ]
  },
  {
    id:"pelelang",slug:"pelelang",short:"JF Pelelang",name:"Pelelang",nav:"JF Pelelang",icon:"gavel",image:"auction.webp",
    theme:"Layanan lelang yang profesional dan terpercaya.",
    intro:"Temukan pengetahuan tentang pelaksanaan lelang, penggalian potensi, dan pengembangan kompetensi profesi Pelelang.",
    definition:"JF Pelelang mempunyai tugas dan ruang lingkup kegiatan lelang serta penggalian potensi lelang. Pelaksanaan tugasnya memerlukan penguasaan ketentuan, ketelitian dokumen, dan integritas profesi.",
    category:"Keahlian",grades:["Ahli Pertama","Ahli Muda","Ahli Madya","Ahli Utama"],
    tasks:["Memeriksa kelengkapan dan ketentuan dokumen lelang.","Melaksanakan kegiatan lelang sesuai kewenangan.","Mendukung penggalian potensi dan peningkatan layanan lelang.","Menjaga administrasi, akuntabilitas, dan kualitas layanan."],
    competence:["Ketentuan dan pelaksanaan lelang","Administrasi serta mitigasi risiko pelaksanaan tugas","Integritas, komunikasi, dan pelayanan publik"],
    nomenclature:"Kerangka jenjang mengikuti aturan JF bidang keuangan negara. Penempatan, bidang tugas, kewenangan, dan ketersediaan jenjang mengikuti ketentuan serta penetapan instansi. Ketentuan Pejabat Lelang Kelas I dibaca pada PMK 124 Tahun 2023.",
    faq:[
      {q:"Apa tugas utama JF Pelelang?",a:"Menurut PMK 132 Tahun 2023, ruang lingkup JF Pelelang mencakup kegiatan lelang dan penggalian potensi lelang. Penugasan serta kewenangan mengikuti ketentuan yang berlaku."},
      {q:"Apa perbedaan JF Pelelang dan Pejabat Lelang Kelas II?",a:"Portal ini berfokus pada jabatan fungsional ASN. Pejabat Lelang Kelas II memiliki ketentuan tersendiri. Untuk Pejabat Lelang Kelas I, lihat PMK 124 Tahun 2023."},
      {q:"Di mana menemukan rujukan kompetensi Pelelang?",a:"Telusuri PMK 196/PMK.06/2017 bersama kerangka JF dalam PMK 132 Tahun 2023 dan informasi terbaru penyelenggaraan dari DJKN."}
    ]
  }
];

export const articles = [
  {
    id:"kompetensi-pelelang-2026",type:"Kabar DJKN",tags:["pelelang"],date:"2026-09-14",displayDate:"14 September 2026",image:"auction.webp",
    title:"Penguatan kompetensi Pelelang melalui uji kompetensi dan apresiasi kinerja",
    excerpt:"Kanwil DJKN Balinusra menggelar Uji Kompetensi Pelelang dan Lelang Award 2026 untuk mendukung kualitas layanan.",
    source:sources.bali,sourceName:"Kanwil DJKN Bali dan Nusa Tenggara",readTime:"2 menit",
    sections:[
      {title:"Pengembangan kompetensi profesi",text:"Pada 9-10 September 2026, Kanwil DJKN Bali dan Nusa Tenggara menyelenggarakan Uji Kompetensi Pelelang dan Lelang Award di Denpasar. Kegiatan ini menempatkan pengembangan kompetensi dan apresiasi kinerja dalam satu rangkaian pembinaan."},
      {title:"Relevansi bagi pejabat fungsional",text:"Bagi Pelelang, pembaruan pengetahuan teknis perlu berjalan bersama peningkatan mutu pelaksanaan tugas. Materi kompetensi dan aturan profesi dapat menjadi titik awal untuk mempersiapkan pembelajaran serta evaluasi."},
      {title:"Baca berita lengkap",text:"Halaman ini merupakan ringkasan editorial Jafa Hub. Informasi pelaksanaan dan konteks kegiatan selengkapnya tersedia pada berita resmi DJKN melalui tautan sumber di bawah."}
    ]
  },
  {
    id:"peran-jf-pengelolaan-aset-daerah",type:"Kabar DJKN",tags:["pp","plb"],date:"2026-07-17",displayDate:"17 Juli 2026",image:"field.webp",
    title:"Peran Penilai dan Penata Laksana Barang dalam pengelolaan aset daerah",
    excerpt:"Penguatan jabatan fungsional menjadi bagian dari upaya meningkatkan akuntabilitas pengelolaan BMD.",
    source:sources.makassar,sourceName:"Kanwil DJKN Sulawesi Selatan, Tenggara, dan Barat",readTime:"2 menit",
    sections:[
      {title:"Penguatan peran di pemerintah daerah",text:"Dalam sosialisasi di Makassar pada 16 Juli 2026, DJKN mendorong pemerintah daerah memperkuat peran Penilai Pemerintah dan Penata Laksana Barang untuk menghadapi kebutuhan pengelolaan BMD."},
      {title:"Dua fungsi yang saling mendukung",text:"Penilaian memberikan informasi nilai untuk keputusan pengelolaan aset. Penatausahaan dan pengelolaan barang membantu menjaga kualitas data serta ketertiban administrasi. Kedua fungsi ini memerlukan dukungan kompetensi dan tata kelola organisasi."},
      {title:"Rujukan pembelajaran",text:"Pelajari profil kedua JF, lalu telusuri kerangka pembinaan dan petunjuk teknis dari sumber resmi. Ringkasan ini mengarahkan pembaca ke berita DJKN untuk informasi kegiatan selengkapnya."}
    ]
  },
  {
    id:"pembinaan-jf-lampung-2026",type:"Kabar DJKN",tags:["pp","plb"],date:"2026-02-06",displayDate:"6 Februari 2026",image:"hero.webp",
    title:"Pembinaan JF dan peningkatan kapasitas penilai di pemerintah daerah",
    excerpt:"Sosialisasi di Lampung membahas kebutuhan JF, pengembangan kompetensi, dan pengelolaan karier.",
    source:sources.lampung,sourceName:"Kanwil DJKN Lampung dan Bengkulu",readTime:"2 menit",
    sections:[
      {title:"Pembinaan lintas instansi",text:"Pada 5 Februari 2026, Kanwil DJKN Lampung dan Bengkulu bersama Direktorat Transformasi dan Sistem Informasi menyelenggarakan sosialisasi JF Penilai Pemerintah dan JF Penata Laksana Barang serta peningkatan kapasitas SDM Penilai di instansi pemerintah daerah."},
      {title:"Topik yang perlu dipahami",text:"Pembinaan mencakup pemahaman tugas, kebutuhan organisasi, kompetensi, dan pengelolaan karier. ASN dan pengelola kepegawaian dapat menggunakan regulasi resmi untuk menelusuri ketentuan yang berkaitan dengan jabatan masing-masing."},
      {title:"Sumber informasi",text:"Ringkasan editorial ini bersumber dari publikasi Kanwil DJKN Lampung dan Bengkulu. Baca berita lengkap untuk konteks acara dan penjelasan narasumber."}
    ]
  },
  {
    id:"memahami-konversi-angka-kredit",type:"Panduan",tags:["pp","plb","pelelang"],date:"2026-10-21",displayDate:"Ditinjau 21 Oktober 2026",image:"field.webp",
    title:"Memahami konversi predikat kinerja menjadi Angka Kredit",
    excerpt:"Kenali hubungan antara jenjang, koefisien tahunan, predikat kinerja, dan periode penilaian.",
    source:sources.bkn3,sourceName:"Peraturan BKN Nomor 3 Tahun 2023",readTime:"3 menit",
    sections:[
      {title:"Dari predikat ke Angka Kredit",text:"Konversi menggunakan persentase predikat kinerja dan koefisien Angka Kredit tahunan sesuai jenjang. Sangat Baik bernilai 150%, Baik 100%, Butuh Perbaikan 75%, Kurang 50%, dan Sangat Kurang 25%."},
      {title:"Memperhitungkan periode",text:"Pasal 13 Peraturan BKN Nomor 3 Tahun 2023 mengatur perhitungan proporsional: jumlah bulan periode penilaian dibagi 12, dikali persentase predikat, dikali koefisien tahunan. Ahli Pertama dengan predikat Sangat Baik selama 12 bulan menghasilkan 18,75 AK."},
      {title:"Gunakan simulator sebagai alat belajar",text:"Simulator Jafa Hub membantu memahami konversi dasar tersebut. Penetapan resmi, angka kredit kumulatif, tambahan pendidikan, dan persyaratan kenaikan pangkat atau jenjang mengikuti prosedur serta ketentuan instansi yang berwenang."}
    ]
  }
];

export const chatTopics = [
  {id:"intro",title:"Kenali tiga jabatan fungsional",keywords:["tiga","jenis","jabatan","apa itu jf","jafa hub"],answer:"Jafa Hub memuat pengetahuan tentang Penilai Pemerintah, Penata Laksana Barang, dan Pelelang. Anda bisa memulai dari profil setiap jabatan, regulasi, atau simulator Angka Kredit.",links:[{label:"Penilai Pemerintah",href:"#/informasi/penilai-pemerintah"},{label:"Penata Laksana Barang",href:"#/informasi/penata-laksana-barang"},{label:"Pelelang",href:"#/informasi/pelelang"}]},
  {id:"ak",title:"Bagaimana menghitung Angka Kredit?",keywords:["angka kredit","konversi","koefisien","hitung","simulasi","predikat","kinerja"],answer:"Rumus konversi proporsional adalah (jumlah bulan / 12) × faktor predikat × koefisien tahunan. Contohnya, Ahli Pertama dengan predikat Sangat Baik selama 12 bulan: 12/12 × 150% × 12,5 = 18,75 AK. Ini simulasi dasar, bukan penetapan PAK.",links:[{label:"Buka simulator",href:"#/simulasi"},{label:"Peraturan BKN 3 Tahun 2023",href:sources.bkn3}]},
  {id:"pp",title:"Apa tugas Penilai Pemerintah?",keywords:["penilai","jfpp","jf pp","penilaian","properti","bisnis","sda"],answer:"Penilai Pemerintah mendukung pengambilan keputusan aset melalui kegiatan penilaian properti, bisnis, dan sumber daya alam. PMK 132 Tahun 2023 menggunakan nomenklatur JF Penilai dan memuat ketentuan penyesuaiannya. Cakupan tugas mengikuti jenjang dan penugasan.",links:[{label:"Profil JF Penilai Pemerintah",href:"#/informasi/penilai-pemerintah"},{label:"PMK 132 Tahun 2023",href:sources.pmk132}]},
  {id:"plb",title:"Apa jenjang Penata Laksana Barang?",keywords:["plb","penata","barang","bmn","bmd","inventaris","aset"],answer:"PMK 44 Tahun 2023 menyebut JFPLB kategori keterampilan dengan jenjang Terampil, Mahir, dan Penyelia. Ruang lingkupnya mencakup pengelolaan BMN/D. Periksa juga ketentuan penyesuaian nomenklatur dalam PMK 132 Tahun 2023.",links:[{label:"Profil JF Penata Laksana Barang",href:"#/informasi/penata-laksana-barang"},{label:"PMK 44 Tahun 2023",href:sources.pmk44},{label:"PMK 132 Tahun 2023",href:sources.pmk132}]},
  {id:"pelelang",title:"Apa rujukan untuk JF Pelelang?",keywords:["pelelang","lelang","kelas i","kelas 1","kelas ii"],answer:"JF Pelelang melaksanakan kegiatan lelang dan penggalian potensi lelang. Mulai dari kerangka JF dalam PMK 132 Tahun 2023. Untuk ketentuan Pejabat Lelang Kelas I, telusuri PMK 124 Tahun 2023.",links:[{label:"Profil JF Pelelang",href:"#/informasi/pelelang"},{label:"PMK 124 Tahun 2023",href:sources.pmk124}]},
  {id:"aturan",title:"Di mana mencari peraturan resmi?",keywords:["aturan","regulasi","peraturan","hukum","pmk","bkn","dasar"],answer:"Gunakan JDIH Kementerian Keuangan dan JDIH BKN untuk memeriksa dokumen resmi serta riwayat perubahannya. Rujukan awal portal ini adalah PMK 132 Tahun 2023 dan Peraturan BKN Nomor 3 Tahun 2023.",links:[{label:"PMK 132 Tahun 2023",href:sources.pmk132},{label:"Peraturan BKN 3 Tahun 2023",href:sources.bkn3}]},
  {id:"kompetensi",title:"Bagaimana pengembangan kompetensi JF?",keywords:["kompetensi","pelatihan","ujian","ukom","karier","pangkat","promosi"],answer:"Pengembangan kompetensi dan persyaratan karier mengikuti aturan jabatan serta petunjuk instansi pembina. Untuk JFPLB, telusuri PMK 44 Tahun 2023. Kenaikan pangkat dan jenjang juga memiliki ketentuan tersendiri dalam Peraturan BKN 3 Tahun 2023.",links:[{label:"Peraturan BKN 3 Tahun 2023",href:sources.bkn3},{label:"PMK 44 Tahun 2023",href:sources.pmk44}]}
];

const normalize = value => value.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
export function matchTopic(question) {
  const normalized = normalize(question);
  if (!normalized) return null;
  const offTopic = ["cuaca","resep","bitcoin","politik","presiden","beli saham","terjemahkan","kode python"];
  if (offTopic.some(term => normalized.includes(term))) return null;
  const scored = chatTopics.map(topic => ({
    topic,
    score: topic.keywords.reduce((sum,key) => {
      const matches=key.includes(" ") ? (" "+normalized+" ").includes(" "+key+" ") : normalized.includes(key);
      return sum+(matches ? (key.includes(" ") ? 3 : 2) : 0);
    },0)
  })).sort((a,b) => b.score-a.score || (a.topic.id==="intro"?1:0)-(b.topic.id==="intro"?1:0));
  return scored[0].score >= 2 ? scored[0].topic : null;
}

export function searchContent(query) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const entries = [
    ...professions.map(p=>({title:p.nav,description:p.intro,type:"Jabatan fungsional",href:"#/informasi/"+p.slug,text:[p.short,p.name,p.definition,...p.competence].join(" ")})),
    ...articles.map(a=>({title:a.title,description:a.excerpt,type:a.type,href:"#/insight/"+a.id,text:[a.title,a.excerpt,...a.tags].join(" ")})),
    ...regulations.map(r=>({title:r.code,description:r.title,type:"Regulasi resmi",href:r.url,text:[r.code,r.title,r.description].join(" ")})),
    {title:"Simulasi Angka Kredit",description:"Konversi predikat kinerja menjadi Angka Kredit tahunan atau proporsional.",type:"Alat bantu",href:"#/simulasi",text:"simulasi angka kredit konversi ak predikat kinerja koefisien hitung"}
  ];
  return entries.map(e=>({...e,score:words.reduce((sum,w)=>sum+(normalize(e.title+" "+e.description+" "+e.text).includes(w)?1:0),0)}))
    .filter(e=>e.score===words.length).sort((a,b)=>b.score-a.score);
}
