/*
  Emma curriculum baseline (edit this file when Frank's school photos arrive).

  Kanji: all 160 grade-2 characters from 文部科学省 学年別漢字配当表.
  `speak` is the primary elementary reading a 2nd grader practices:
  the common 訓読み when that is the word she says, otherwise the 音読み.
  Examples that are easy to get wrong from a raw dictionary dump:
  午 is ご (not うま), 食 is たべる (not くう), 肉 is にく, 万 is まん,
  魚 is さかな, 門 is もん, 絵 is え.

  九九: traditional chant text for 1×1 through 9×9.
  The spoken form is public-domain school chant text, not a commercial recording.
  The number she writes is always a×b. Practice order starts at 2のだん.
*/
var KANJI = [
  {
    "kind": "kanji",
    "id": "春",
    "kanji": "春",
    "speak": "はる"
  },
  {
    "kind": "kanji",
    "id": "夏",
    "kanji": "夏",
    "speak": "なつ"
  },
  {
    "kind": "kanji",
    "id": "秋",
    "kanji": "秋",
    "speak": "あき"
  },
  {
    "kind": "kanji",
    "id": "冬",
    "kanji": "冬",
    "speak": "ふゆ"
  },
  {
    "kind": "kanji",
    "id": "父",
    "kanji": "父",
    "speak": "ちち"
  },
  {
    "kind": "kanji",
    "id": "母",
    "kanji": "母",
    "speak": "はは"
  },
  {
    "kind": "kanji",
    "id": "兄",
    "kanji": "兄",
    "speak": "あに"
  },
  {
    "kind": "kanji",
    "id": "姉",
    "kanji": "姉",
    "speak": "あね"
  },
  {
    "kind": "kanji",
    "id": "弟",
    "kanji": "弟",
    "speak": "おとうと"
  },
  {
    "kind": "kanji",
    "id": "妹",
    "kanji": "妹",
    "speak": "いもうと"
  },
  {
    "kind": "kanji",
    "id": "友",
    "kanji": "友",
    "speak": "とも"
  },
  {
    "kind": "kanji",
    "id": "東",
    "kanji": "東",
    "speak": "ひがし"
  },
  {
    "kind": "kanji",
    "id": "西",
    "kanji": "西",
    "speak": "にし"
  },
  {
    "kind": "kanji",
    "id": "南",
    "kanji": "南",
    "speak": "みなみ"
  },
  {
    "kind": "kanji",
    "id": "北",
    "kanji": "北",
    "speak": "きた"
  },
  {
    "kind": "kanji",
    "id": "海",
    "kanji": "海",
    "speak": "うみ"
  },
  {
    "kind": "kanji",
    "id": "池",
    "kanji": "池",
    "speak": "いけ"
  },
  {
    "kind": "kanji",
    "id": "谷",
    "kanji": "谷",
    "speak": "たに"
  },
  {
    "kind": "kanji",
    "id": "野",
    "kanji": "野",
    "speak": "の"
  },
  {
    "kind": "kanji",
    "id": "里",
    "kanji": "里",
    "speak": "さと"
  },
  {
    "kind": "kanji",
    "id": "原",
    "kanji": "原",
    "speak": "はら"
  },
  {
    "kind": "kanji",
    "id": "岩",
    "kanji": "岩",
    "speak": "いわ"
  },
  {
    "kind": "kanji",
    "id": "風",
    "kanji": "風",
    "speak": "かぜ"
  },
  {
    "kind": "kanji",
    "id": "雪",
    "kanji": "雪",
    "speak": "ゆき"
  },
  {
    "kind": "kanji",
    "id": "雲",
    "kanji": "雲",
    "speak": "くも"
  },
  {
    "kind": "kanji",
    "id": "星",
    "kanji": "星",
    "speak": "ほし"
  },
  {
    "kind": "kanji",
    "id": "晴",
    "kanji": "晴",
    "speak": "はれる"
  },
  {
    "kind": "kanji",
    "id": "朝",
    "kanji": "朝",
    "speak": "あさ"
  },
  {
    "kind": "kanji",
    "id": "昼",
    "kanji": "昼",
    "speak": "ひる"
  },
  {
    "kind": "kanji",
    "id": "夜",
    "kanji": "夜",
    "speak": "よる"
  },
  {
    "kind": "kanji",
    "id": "今",
    "kanji": "今",
    "speak": "いま"
  },
  {
    "kind": "kanji",
    "id": "時",
    "kanji": "時",
    "speak": "とき"
  },
  {
    "kind": "kanji",
    "id": "週",
    "kanji": "週",
    "speak": "しゅう"
  },
  {
    "kind": "kanji",
    "id": "曜",
    "kanji": "曜",
    "speak": "よう"
  },
  {
    "kind": "kanji",
    "id": "午",
    "kanji": "午",
    "speak": "ご"
  },
  {
    "kind": "kanji",
    "id": "前",
    "kanji": "前",
    "speak": "まえ"
  },
  {
    "kind": "kanji",
    "id": "後",
    "kanji": "後",
    "speak": "あと"
  },
  {
    "kind": "kanji",
    "id": "毎",
    "kanji": "毎",
    "speak": "まい"
  },
  {
    "kind": "kanji",
    "id": "間",
    "kanji": "間",
    "speak": "あいだ"
  },
  {
    "kind": "kanji",
    "id": "読",
    "kanji": "読",
    "speak": "よむ"
  },
  {
    "kind": "kanji",
    "id": "書",
    "kanji": "書",
    "speak": "かく"
  },
  {
    "kind": "kanji",
    "id": "話",
    "kanji": "話",
    "speak": "はなす"
  },
  {
    "kind": "kanji",
    "id": "語",
    "kanji": "語",
    "speak": "ご"
  },
  {
    "kind": "kanji",
    "id": "記",
    "kanji": "記",
    "speak": "き"
  },
  {
    "kind": "kanji",
    "id": "紙",
    "kanji": "紙",
    "speak": "かみ"
  },
  {
    "kind": "kanji",
    "id": "教",
    "kanji": "教",
    "speak": "おしえる"
  },
  {
    "kind": "kanji",
    "id": "考",
    "kanji": "考",
    "speak": "かんがえる"
  },
  {
    "kind": "kanji",
    "id": "算",
    "kanji": "算",
    "speak": "さん"
  },
  {
    "kind": "kanji",
    "id": "数",
    "kanji": "数",
    "speak": "かず"
  },
  {
    "kind": "kanji",
    "id": "答",
    "kanji": "答",
    "speak": "こたえる"
  },
  {
    "kind": "kanji",
    "id": "牛",
    "kanji": "牛",
    "speak": "うし"
  },
  {
    "kind": "kanji",
    "id": "馬",
    "kanji": "馬",
    "speak": "うま"
  },
  {
    "kind": "kanji",
    "id": "魚",
    "kanji": "魚",
    "speak": "さかな"
  },
  {
    "kind": "kanji",
    "id": "鳥",
    "kanji": "鳥",
    "speak": "とり"
  },
  {
    "kind": "kanji",
    "id": "鳴",
    "kanji": "鳴",
    "speak": "なく"
  },
  {
    "kind": "kanji",
    "id": "毛",
    "kanji": "毛",
    "speak": "け"
  },
  {
    "kind": "kanji",
    "id": "羽",
    "kanji": "羽",
    "speak": "はね"
  },
  {
    "kind": "kanji",
    "id": "米",
    "kanji": "米",
    "speak": "こめ"
  },
  {
    "kind": "kanji",
    "id": "茶",
    "kanji": "茶",
    "speak": "ちゃ"
  },
  {
    "kind": "kanji",
    "id": "肉",
    "kanji": "肉",
    "speak": "にく"
  },
  {
    "kind": "kanji",
    "id": "食",
    "kanji": "食",
    "speak": "たべる"
  },
  {
    "kind": "kanji",
    "id": "麦",
    "kanji": "麦",
    "speak": "むぎ"
  },
  {
    "kind": "kanji",
    "id": "色",
    "kanji": "色",
    "speak": "いろ"
  },
  {
    "kind": "kanji",
    "id": "黄",
    "kanji": "黄",
    "speak": "き"
  },
  {
    "kind": "kanji",
    "id": "黒",
    "kanji": "黒",
    "speak": "くろ"
  },
  {
    "kind": "kanji",
    "id": "走",
    "kanji": "走",
    "speak": "はしる"
  },
  {
    "kind": "kanji",
    "id": "歩",
    "kanji": "歩",
    "speak": "あるく"
  },
  {
    "kind": "kanji",
    "id": "来",
    "kanji": "来",
    "speak": "くる"
  },
  {
    "kind": "kanji",
    "id": "行",
    "kanji": "行",
    "speak": "いく"
  },
  {
    "kind": "kanji",
    "id": "買",
    "kanji": "買",
    "speak": "かう"
  },
  {
    "kind": "kanji",
    "id": "売",
    "kanji": "売",
    "speak": "うる"
  },
  {
    "kind": "kanji",
    "id": "作",
    "kanji": "作",
    "speak": "つくる"
  },
  {
    "kind": "kanji",
    "id": "引",
    "kanji": "引",
    "speak": "ひく"
  },
  {
    "kind": "kanji",
    "id": "切",
    "kanji": "切",
    "speak": "きる"
  },
  {
    "kind": "kanji",
    "id": "止",
    "kanji": "止",
    "speak": "とまる"
  },
  {
    "kind": "kanji",
    "id": "知",
    "kanji": "知",
    "speak": "しる"
  },
  {
    "kind": "kanji",
    "id": "思",
    "kanji": "思",
    "speak": "おもう"
  },
  {
    "kind": "kanji",
    "id": "聞",
    "kanji": "聞",
    "speak": "きく"
  },
  {
    "kind": "kanji",
    "id": "通",
    "kanji": "通",
    "speak": "とおる"
  },
  {
    "kind": "kanji",
    "id": "近",
    "kanji": "近",
    "speak": "ちかい"
  },
  {
    "kind": "kanji",
    "id": "遠",
    "kanji": "遠",
    "speak": "とおい"
  },
  {
    "kind": "kanji",
    "id": "帰",
    "kanji": "帰",
    "speak": "かえる"
  },
  {
    "kind": "kanji",
    "id": "国",
    "kanji": "国",
    "speak": "くに"
  },
  {
    "kind": "kanji",
    "id": "家",
    "kanji": "家",
    "speak": "いえ"
  },
  {
    "kind": "kanji",
    "id": "室",
    "kanji": "室",
    "speak": "しつ"
  },
  {
    "kind": "kanji",
    "id": "店",
    "kanji": "店",
    "speak": "みせ"
  },
  {
    "kind": "kanji",
    "id": "寺",
    "kanji": "寺",
    "speak": "てら"
  },
  {
    "kind": "kanji",
    "id": "社",
    "kanji": "社",
    "speak": "しゃ"
  },
  {
    "kind": "kanji",
    "id": "園",
    "kanji": "園",
    "speak": "えん"
  },
  {
    "kind": "kanji",
    "id": "門",
    "kanji": "門",
    "speak": "もん"
  },
  {
    "kind": "kanji",
    "id": "道",
    "kanji": "道",
    "speak": "みち"
  },
  {
    "kind": "kanji",
    "id": "市",
    "kanji": "市",
    "speak": "し"
  },
  {
    "kind": "kanji",
    "id": "万",
    "kanji": "万",
    "speak": "まん"
  },
  {
    "kind": "kanji",
    "id": "丸",
    "kanji": "丸",
    "speak": "まる"
  },
  {
    "kind": "kanji",
    "id": "交",
    "kanji": "交",
    "speak": "こう"
  },
  {
    "kind": "kanji",
    "id": "京",
    "kanji": "京",
    "speak": "きょう"
  },
  {
    "kind": "kanji",
    "id": "会",
    "kanji": "会",
    "speak": "あう"
  },
  {
    "kind": "kanji",
    "id": "体",
    "kanji": "体",
    "speak": "からだ"
  },
  {
    "kind": "kanji",
    "id": "何",
    "kanji": "何",
    "speak": "なに"
  },
  {
    "kind": "kanji",
    "id": "元",
    "kanji": "元",
    "speak": "もと"
  },
  {
    "kind": "kanji",
    "id": "光",
    "kanji": "光",
    "speak": "ひかり"
  },
  {
    "kind": "kanji",
    "id": "公",
    "kanji": "公",
    "speak": "こう"
  },
  {
    "kind": "kanji",
    "id": "内",
    "kanji": "内",
    "speak": "うち"
  },
  {
    "kind": "kanji",
    "id": "刀",
    "kanji": "刀",
    "speak": "かたな"
  },
  {
    "kind": "kanji",
    "id": "分",
    "kanji": "分",
    "speak": "わける"
  },
  {
    "kind": "kanji",
    "id": "半",
    "kanji": "半",
    "speak": "はん"
  },
  {
    "kind": "kanji",
    "id": "古",
    "kanji": "古",
    "speak": "ふるい"
  },
  {
    "kind": "kanji",
    "id": "台",
    "kanji": "台",
    "speak": "だい"
  },
  {
    "kind": "kanji",
    "id": "合",
    "kanji": "合",
    "speak": "あう"
  },
  {
    "kind": "kanji",
    "id": "同",
    "kanji": "同",
    "speak": "おなじ"
  },
  {
    "kind": "kanji",
    "id": "回",
    "kanji": "回",
    "speak": "まわる"
  },
  {
    "kind": "kanji",
    "id": "図",
    "kanji": "図",
    "speak": "ず"
  },
  {
    "kind": "kanji",
    "id": "地",
    "kanji": "地",
    "speak": "ち"
  },
  {
    "kind": "kanji",
    "id": "場",
    "kanji": "場",
    "speak": "ば"
  },
  {
    "kind": "kanji",
    "id": "声",
    "kanji": "声",
    "speak": "こえ"
  },
  {
    "kind": "kanji",
    "id": "外",
    "kanji": "外",
    "speak": "そと"
  },
  {
    "kind": "kanji",
    "id": "多",
    "kanji": "多",
    "speak": "おおい"
  },
  {
    "kind": "kanji",
    "id": "太",
    "kanji": "太",
    "speak": "ふとい"
  },
  {
    "kind": "kanji",
    "id": "少",
    "kanji": "少",
    "speak": "すくない"
  },
  {
    "kind": "kanji",
    "id": "工",
    "kanji": "工",
    "speak": "こう"
  },
  {
    "kind": "kanji",
    "id": "広",
    "kanji": "広",
    "speak": "ひろい"
  },
  {
    "kind": "kanji",
    "id": "弓",
    "kanji": "弓",
    "speak": "ゆみ"
  },
  {
    "kind": "kanji",
    "id": "弱",
    "kanji": "弱",
    "speak": "よわい"
  },
  {
    "kind": "kanji",
    "id": "強",
    "kanji": "強",
    "speak": "つよい"
  },
  {
    "kind": "kanji",
    "id": "当",
    "kanji": "当",
    "speak": "あたる"
  },
  {
    "kind": "kanji",
    "id": "形",
    "kanji": "形",
    "speak": "かたち"
  },
  {
    "kind": "kanji",
    "id": "心",
    "kanji": "心",
    "speak": "こころ"
  },
  {
    "kind": "kanji",
    "id": "戸",
    "kanji": "戸",
    "speak": "と"
  },
  {
    "kind": "kanji",
    "id": "才",
    "kanji": "才",
    "speak": "さい"
  },
  {
    "kind": "kanji",
    "id": "新",
    "kanji": "新",
    "speak": "あたらしい"
  },
  {
    "kind": "kanji",
    "id": "方",
    "kanji": "方",
    "speak": "ほう"
  },
  {
    "kind": "kanji",
    "id": "明",
    "kanji": "明",
    "speak": "あかるい"
  },
  {
    "kind": "kanji",
    "id": "楽",
    "kanji": "楽",
    "speak": "たのしい"
  },
  {
    "kind": "kanji",
    "id": "歌",
    "kanji": "歌",
    "speak": "うた"
  },
  {
    "kind": "kanji",
    "id": "汽",
    "kanji": "汽",
    "speak": "き"
  },
  {
    "kind": "kanji",
    "id": "活",
    "kanji": "活",
    "speak": "かつ"
  },
  {
    "kind": "kanji",
    "id": "点",
    "kanji": "点",
    "speak": "てん"
  },
  {
    "kind": "kanji",
    "id": "理",
    "kanji": "理",
    "speak": "り"
  },
  {
    "kind": "kanji",
    "id": "用",
    "kanji": "用",
    "speak": "よう"
  },
  {
    "kind": "kanji",
    "id": "画",
    "kanji": "画",
    "speak": "が"
  },
  {
    "kind": "kanji",
    "id": "番",
    "kanji": "番",
    "speak": "ばん"
  },
  {
    "kind": "kanji",
    "id": "直",
    "kanji": "直",
    "speak": "なおす"
  },
  {
    "kind": "kanji",
    "id": "矢",
    "kanji": "矢",
    "speak": "や"
  },
  {
    "kind": "kanji",
    "id": "科",
    "kanji": "科",
    "speak": "か"
  },
  {
    "kind": "kanji",
    "id": "細",
    "kanji": "細",
    "speak": "ほそい"
  },
  {
    "kind": "kanji",
    "id": "組",
    "kanji": "組",
    "speak": "くむ"
  },
  {
    "kind": "kanji",
    "id": "絵",
    "kanji": "絵",
    "speak": "え"
  },
  {
    "kind": "kanji",
    "id": "線",
    "kanji": "線",
    "speak": "せん"
  },
  {
    "kind": "kanji",
    "id": "自",
    "kanji": "自",
    "speak": "じ"
  },
  {
    "kind": "kanji",
    "id": "船",
    "kanji": "船",
    "speak": "ふね"
  },
  {
    "kind": "kanji",
    "id": "親",
    "kanji": "親",
    "speak": "おや"
  },
  {
    "kind": "kanji",
    "id": "角",
    "kanji": "角",
    "speak": "かど"
  },
  {
    "kind": "kanji",
    "id": "言",
    "kanji": "言",
    "speak": "いう"
  },
  {
    "kind": "kanji",
    "id": "計",
    "kanji": "計",
    "speak": "けい"
  },
  {
    "kind": "kanji",
    "id": "長",
    "kanji": "長",
    "speak": "ながい"
  },
  {
    "kind": "kanji",
    "id": "電",
    "kanji": "電",
    "speak": "でん"
  },
  {
    "kind": "kanji",
    "id": "頭",
    "kanji": "頭",
    "speak": "あたま"
  },
  {
    "kind": "kanji",
    "id": "顔",
    "kanji": "顔",
    "speak": "かお"
  },
  {
    "kind": "kanji",
    "id": "首",
    "kanji": "首",
    "speak": "くび"
  },
  {
    "kind": "kanji",
    "id": "高",
    "kanji": "高",
    "speak": "たかい"
  }
];
var KUKU = [
  {
    "kind": "kuku",
    "id": "2x1",
    "a": 2,
    "b": 1,
    "speak": "にいちがに"
  },
  {
    "kind": "kuku",
    "id": "2x2",
    "a": 2,
    "b": 2,
    "speak": "ににんがし"
  },
  {
    "kind": "kuku",
    "id": "2x3",
    "a": 2,
    "b": 3,
    "speak": "にさんがろく"
  },
  {
    "kind": "kuku",
    "id": "2x4",
    "a": 2,
    "b": 4,
    "speak": "にしがはち"
  },
  {
    "kind": "kuku",
    "id": "2x5",
    "a": 2,
    "b": 5,
    "speak": "にごじゅう"
  },
  {
    "kind": "kuku",
    "id": "2x6",
    "a": 2,
    "b": 6,
    "speak": "にろくじゅうに"
  },
  {
    "kind": "kuku",
    "id": "2x7",
    "a": 2,
    "b": 7,
    "speak": "にしちじゅうし"
  },
  {
    "kind": "kuku",
    "id": "2x8",
    "a": 2,
    "b": 8,
    "speak": "にはちじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "2x9",
    "a": 2,
    "b": 9,
    "speak": "にくじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "3x1",
    "a": 3,
    "b": 1,
    "speak": "さんいちがさん"
  },
  {
    "kind": "kuku",
    "id": "3x2",
    "a": 3,
    "b": 2,
    "speak": "さんにがろく"
  },
  {
    "kind": "kuku",
    "id": "3x3",
    "a": 3,
    "b": 3,
    "speak": "さざんがく"
  },
  {
    "kind": "kuku",
    "id": "3x4",
    "a": 3,
    "b": 4,
    "speak": "さんしじゅうに"
  },
  {
    "kind": "kuku",
    "id": "3x5",
    "a": 3,
    "b": 5,
    "speak": "さんごじゅうご"
  },
  {
    "kind": "kuku",
    "id": "3x6",
    "a": 3,
    "b": 6,
    "speak": "さぶろくじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "3x7",
    "a": 3,
    "b": 7,
    "speak": "さんしちにじゅういち"
  },
  {
    "kind": "kuku",
    "id": "3x8",
    "a": 3,
    "b": 8,
    "speak": "さんぱにじゅうし"
  },
  {
    "kind": "kuku",
    "id": "3x9",
    "a": 3,
    "b": 9,
    "speak": "さんくにじゅうしち"
  },
  {
    "kind": "kuku",
    "id": "4x1",
    "a": 4,
    "b": 1,
    "speak": "しいちがし"
  },
  {
    "kind": "kuku",
    "id": "4x2",
    "a": 4,
    "b": 2,
    "speak": "しにがはち"
  },
  {
    "kind": "kuku",
    "id": "4x3",
    "a": 4,
    "b": 3,
    "speak": "しさんじゅうに"
  },
  {
    "kind": "kuku",
    "id": "4x4",
    "a": 4,
    "b": 4,
    "speak": "ししじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "4x5",
    "a": 4,
    "b": 5,
    "speak": "しごにじゅう"
  },
  {
    "kind": "kuku",
    "id": "4x6",
    "a": 4,
    "b": 6,
    "speak": "しろくにじゅうし"
  },
  {
    "kind": "kuku",
    "id": "4x7",
    "a": 4,
    "b": 7,
    "speak": "ししちにじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "4x8",
    "a": 4,
    "b": 8,
    "speak": "しはさんじゅうに"
  },
  {
    "kind": "kuku",
    "id": "4x9",
    "a": 4,
    "b": 9,
    "speak": "しくさんじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "5x1",
    "a": 5,
    "b": 1,
    "speak": "ごいちがご"
  },
  {
    "kind": "kuku",
    "id": "5x2",
    "a": 5,
    "b": 2,
    "speak": "ごにじゅう"
  },
  {
    "kind": "kuku",
    "id": "5x3",
    "a": 5,
    "b": 3,
    "speak": "ごさんじゅうご"
  },
  {
    "kind": "kuku",
    "id": "5x4",
    "a": 5,
    "b": 4,
    "speak": "ごしにじゅう"
  },
  {
    "kind": "kuku",
    "id": "5x5",
    "a": 5,
    "b": 5,
    "speak": "ごごにじゅうご"
  },
  {
    "kind": "kuku",
    "id": "5x6",
    "a": 5,
    "b": 6,
    "speak": "ごろくさんじゅう"
  },
  {
    "kind": "kuku",
    "id": "5x7",
    "a": 5,
    "b": 7,
    "speak": "ごしちさんじゅうご"
  },
  {
    "kind": "kuku",
    "id": "5x8",
    "a": 5,
    "b": 8,
    "speak": "ごはしじゅう"
  },
  {
    "kind": "kuku",
    "id": "5x9",
    "a": 5,
    "b": 9,
    "speak": "ごっくしじゅうご"
  },
  {
    "kind": "kuku",
    "id": "6x1",
    "a": 6,
    "b": 1,
    "speak": "ろくいちがろく"
  },
  {
    "kind": "kuku",
    "id": "6x2",
    "a": 6,
    "b": 2,
    "speak": "ろくにじゅうに"
  },
  {
    "kind": "kuku",
    "id": "6x3",
    "a": 6,
    "b": 3,
    "speak": "ろくさんじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "6x4",
    "a": 6,
    "b": 4,
    "speak": "ろくしにじゅうし"
  },
  {
    "kind": "kuku",
    "id": "6x5",
    "a": 6,
    "b": 5,
    "speak": "ろくごさんじゅう"
  },
  {
    "kind": "kuku",
    "id": "6x6",
    "a": 6,
    "b": 6,
    "speak": "ろくろくさんじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "6x7",
    "a": 6,
    "b": 7,
    "speak": "ろくしちしじゅうに"
  },
  {
    "kind": "kuku",
    "id": "6x8",
    "a": 6,
    "b": 8,
    "speak": "ろくはしじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "6x9",
    "a": 6,
    "b": 9,
    "speak": "ろっくごじゅうし"
  },
  {
    "kind": "kuku",
    "id": "7x1",
    "a": 7,
    "b": 1,
    "speak": "しちいちがしち"
  },
  {
    "kind": "kuku",
    "id": "7x2",
    "a": 7,
    "b": 2,
    "speak": "しちにじゅうし"
  },
  {
    "kind": "kuku",
    "id": "7x3",
    "a": 7,
    "b": 3,
    "speak": "しちさんにじゅういち"
  },
  {
    "kind": "kuku",
    "id": "7x4",
    "a": 7,
    "b": 4,
    "speak": "しちしにじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "7x5",
    "a": 7,
    "b": 5,
    "speak": "しちごさんじゅうご"
  },
  {
    "kind": "kuku",
    "id": "7x6",
    "a": 7,
    "b": 6,
    "speak": "しちろくしじゅうに"
  },
  {
    "kind": "kuku",
    "id": "7x7",
    "a": 7,
    "b": 7,
    "speak": "しちしちしじゅうく"
  },
  {
    "kind": "kuku",
    "id": "7x8",
    "a": 7,
    "b": 8,
    "speak": "しちはごじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "7x9",
    "a": 7,
    "b": 9,
    "speak": "しちくろくじゅうさん"
  },
  {
    "kind": "kuku",
    "id": "8x1",
    "a": 8,
    "b": 1,
    "speak": "はちいちがはち"
  },
  {
    "kind": "kuku",
    "id": "8x2",
    "a": 8,
    "b": 2,
    "speak": "はちにじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "8x3",
    "a": 8,
    "b": 3,
    "speak": "はちさんにじゅうし"
  },
  {
    "kind": "kuku",
    "id": "8x4",
    "a": 8,
    "b": 4,
    "speak": "はちしさんじゅうに"
  },
  {
    "kind": "kuku",
    "id": "8x5",
    "a": 8,
    "b": 5,
    "speak": "はちごしじゅう"
  },
  {
    "kind": "kuku",
    "id": "8x6",
    "a": 8,
    "b": 6,
    "speak": "はちろくしじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "8x7",
    "a": 8,
    "b": 7,
    "speak": "はちしちごじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "8x8",
    "a": 8,
    "b": 8,
    "speak": "はっぱろくじゅうし"
  },
  {
    "kind": "kuku",
    "id": "8x9",
    "a": 8,
    "b": 9,
    "speak": "はっくしちじゅうに"
  },
  {
    "kind": "kuku",
    "id": "9x1",
    "a": 9,
    "b": 1,
    "speak": "くいちがく"
  },
  {
    "kind": "kuku",
    "id": "9x2",
    "a": 9,
    "b": 2,
    "speak": "くにじゅうはち"
  },
  {
    "kind": "kuku",
    "id": "9x3",
    "a": 9,
    "b": 3,
    "speak": "くさんにじゅうしち"
  },
  {
    "kind": "kuku",
    "id": "9x4",
    "a": 9,
    "b": 4,
    "speak": "くしさんじゅうろく"
  },
  {
    "kind": "kuku",
    "id": "9x5",
    "a": 9,
    "b": 5,
    "speak": "くごしじゅうご"
  },
  {
    "kind": "kuku",
    "id": "9x6",
    "a": 9,
    "b": 6,
    "speak": "くろくごじゅうし"
  },
  {
    "kind": "kuku",
    "id": "9x7",
    "a": 9,
    "b": 7,
    "speak": "くしちろくじゅうさん"
  },
  {
    "kind": "kuku",
    "id": "9x8",
    "a": 9,
    "b": 8,
    "speak": "くはしちじゅうに"
  },
  {
    "kind": "kuku",
    "id": "9x9",
    "a": 9,
    "b": 9,
    "speak": "くくはちじゅういち"
  },
  {
    "kind": "kuku",
    "id": "1x1",
    "a": 1,
    "b": 1,
    "speak": "いんいちがいち"
  },
  {
    "kind": "kuku",
    "id": "1x2",
    "a": 1,
    "b": 2,
    "speak": "いんにがに"
  },
  {
    "kind": "kuku",
    "id": "1x3",
    "a": 1,
    "b": 3,
    "speak": "いんさんがさん"
  },
  {
    "kind": "kuku",
    "id": "1x4",
    "a": 1,
    "b": 4,
    "speak": "いんしがし"
  },
  {
    "kind": "kuku",
    "id": "1x5",
    "a": 1,
    "b": 5,
    "speak": "いんごがご"
  },
  {
    "kind": "kuku",
    "id": "1x6",
    "a": 1,
    "b": 6,
    "speak": "いんろくがろく"
  },
  {
    "kind": "kuku",
    "id": "1x7",
    "a": 1,
    "b": 7,
    "speak": "いんしちがしち"
  },
  {
    "kind": "kuku",
    "id": "1x8",
    "a": 1,
    "b": 8,
    "speak": "いんはちがはち"
  },
  {
    "kind": "kuku",
    "id": "1x9",
    "a": 1,
    "b": 9,
    "speak": "いんくがく"
  }
];
