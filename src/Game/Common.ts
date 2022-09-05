export const Debug = {
	epsilon: 1e-6,
	disableManaTicks: false,
	consoleLogEvents: false,
	noEnochian: false,
	constantSlidecastWindow: true,
};

export const enum Aspect {
	Fire = "Fire",
	Ice = "Ice",
	Lightning = "Lightning",
	Other = "Other"
}

export const enum SkillName {
	Blizzard = "Blizzard",
	Fire = "Fire",
	Transpose = "Transpose",
	Thunder3 = "Thunder 3",
	Manaward = "Manaward",
	Manafont = "Manafont",
	LeyLines = "Ley Lines",
	Fire3 = "Fire 3",
	Blizzard3 = "Blizzard 3",
	Freeze = "Freeze",
	Flare = "Flare",
	Sharpcast = "Sharpcast",
	Blizzard4 = "Blizzard 4",
	Fire4 = "Fire 4",
	BetweenTheLines = "Between the Lines",
	AetherialManipulation = "Aetherial Manipulation",
	// Thunder4 = "Thunder 4",
	Triplecast = "Triplecast",
	Foul = "Foul",
	Despair = "Despair",
	UmbralSoul = "Umbral Soul",
	Xenoglossy = "Xenoglossy",
	HighFire2 = "High Fire 2",
	HighBlizzard2 = "High Blizzard 2",
	Amplifier = "Amplifier",
	Paradox = "Paradox",
	Addle = "Addle",
	Swiftcast = "Swiftcast",
	LucidDreaming = "Lucid Dreaming",
	Surecast = "Surecast",
	Tincture = "Tincture",
	Sprint = "Sprint",
	// Bozja //
	FlareStar = "Flare Star",
	EtherKit = "Ether Kit",
	Elixir = "Resistance Elixir",

	// Essences
	Reg_Skirmisher = "Regular Skirmisher",
	Skirmisher = "Skirmisher",
	Watcher = "Watcher",
	Gambler = "Gambler",
	Elder = "Elder",

	// Misc bozja actions
	Excellence = "Excellence",
	Dervish = "Dervish",
	full_uptime_bravery = "Full Uptime Bravery (10%)",
	five_Bravery = "10 Minute Bravery (5%)",
	ten_Bravery = "1 Minute Bravery (10%)",
	FoM = "Font of Magic",
	Chainspell = "Chainspell",
	MagicBurst = "Magic Burst",




	Never = "Never",
}

export const enum SkillReadyStatus {
	Ready = "ready",
	Blocked = "blocked by CD, animation lock or caster tax",
	NotEnoughMP = "not enough MP",
	RequirementsNotMet = "requirements not met",
}

export const enum ResourceType {
	// job resources
	Mana = "Mana", // [0, 10000]
	Polyglot = "Polyglot", // [0, 2]
	AstralFire = "AstralFire", // [0, 3]
	UmbralIce = "UmbralIce", // [0, 3]
	UmbralHeart = "UmbralHeart", // [0, 3]
	Enochian = "Enochian", // [0, 1]
	Paradox = "Paradox", // [0, 1]

	// buffs & states
	LeyLines = "Ley Lines", // [0, 1]
	Sharpcast = "Sharpcast", // [0, 1]
	Triplecast = "Triplecast", // [0, 3]
	Firestarter = "Firestarter", // [0, 1]
	Thundercloud = "Thundercloud", // [0, 1]
	ThunderDoT = "ThunderDoT", // [0, 1] is actually used for display timing only
	ThunderDoTTick = "ThunderDoTTick", // [0, 1]

	Manaward = "Manaward", // [0, 1]
	Addle = "Addle", // [0, 1]
	Swiftcast = "Swiftcast", // [0, 1]
	LucidDreamingTimerDisplay = "Lucid Dreaming", // [0, 1] also just for timing display
	FoMTimerDisplay = "Font of Magic", // only for timer display
	LucidTick = "Lucid Tick", // [0, 1]
	Surecast = "Surecast", // [0, 1]
	Tincture = "Tincture", // [0, 1]
	Sprint = "Sprint", // [0, 1]

	//Bozja
	FlareStarDoT = "FlareStarDoT",
	FlareStarDoTTick = "FlareStarDoTTick",
	EtherKit = "Ether Kit", //[0, 3]
	Reg_Skirmisher = "Regular Skirmisher",
	Skirmisher = "Skirmisher",
	Watcher = "Watcher",
	Gambler = "Gambler",
	Elder = "Elder",
	Excellence = "Excellence",
	Dervish = "Dervish",
	five_Bravery = "5% Bravery", //10 min
	uptime_Bravery = "Full Uptime 10% Bravery", //10 min
	ten_Bravery = "10% Bravery", //60s
	FoMTick = "Font of Magic",
	Chainspell = "Chainspell",
	MagicBurst = "Magic Burst",
	cd_Chainspell = "Chainspell",
	cd_MagicBurst = "Magic Burst",
	cd_Dervish = "Dervish",
	cd_Excellence = "cd_Excellence",
	cd_Elixir = "cd_Elixir", // [0, 1x]
	cd_Essence = "cd_Essence",
	cd_FlareStar = "cd_FlareStar", //not used yet?
	cd_Reg_Skirmisher = "cd_Reg_Skirmisher",
	cd_Skirmisher = "cd_Skirmisher",
	cd_Watcher = "cd_Watcher",
	cd_Gambler = "cd_Gambler",
	cd_Elder = "cd_Gambler",
	cd_Ten_Bravery = "cd_Ten_Bravery", // 1 min - 10%
	cd_five_Bravery = "cd_five_Bravery", //10 min - 5%
	cd_uptime_Bravery = "cd_uptime_Bravery", //10 min - 10%
	cd_FoM = "cd_FoM",


	// special
	Movement = "Movement", // [0, 1]
	NotAnimationLocked = "NotAnimationLocked", // [0, 1]
	NotCasterTaxed = "NotCasterTaxed", // [0, 1]

	// CDs
	cd_GCD = "cd_GCD", // [0, Constant.gcd]
	cd_Transpose = "cd_Transpose", // [0, 1x]
	cd_Sharpcast = "cd_Sharpcast", // [0, 2x] // TODO = figure out how this works
	cd_LeyLines = "cd_LeyLines", // [0, 1x]
	cd_Manaward = "cd_Manaward", // [0, 1x]
	cd_BetweenTheLines = "cd_BetweenTheLines", // [0, 1x]
	cd_AetherialManipulation = "cd_AetherialManipulation", // [0, 1x]
	cd_Triplecast = "cd_Triplecast", // [0, 2x]
	cd_EtherKit = "cd_Etherkit",
	cd_Manafont = "cd_Manafont", // [0, 1x]
	cd_Amplifier = "cd_Amplifier", // [0, 1x]
	cd_Addle = "cd_Addle", // [0, 1x]
	cd_Swiftcast = "cd_Swiftcast", // [0, 1x]
	cd_LucidDreaming = "cd_LucidDreaming", // [0, 1x]
	cd_Surecast = "cd_Surecast", // [0, 1x]
	cd_Tincture = "cd_Tincture", // [0, 1x]
	cd_Sprint = "cd_Sprint", // [0, 1x]
	Never = "Never",
}
