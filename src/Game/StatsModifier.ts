import {Debug, ResourceType} from "./Common"
import {ResourceState} from "./Resources";

export class StatsModifier
{
	damageBase = 1;
	damageFire = 1;
	damageIce = 1;
	castTimeBase = 1;
	castTimeFire = 1;
	castTimeIce = 1;
	spellRecastTimeScale = 1;
	manaCostFire = 1;
	manaCostIce = 1;
	CH = 1;
	DH = 1;
	manaRegen = 0;
	uhConsumption = 0;

	reset()
	{
		this.damageBase = 1;
		this.damageFire = 1;
		this.damageIce = 1;
		this.castTimeBase = 1;
		this.castTimeFire = 1;
		this.castTimeIce = 1;
		this.spellRecastTimeScale = 1;
		this.manaCostFire = 1;
		this.manaCostIce = 1;
		this.CH = 1;
		this.DH = 1;

		// additive constant
		this.manaRegen = 0;
		this.uhConsumption = 0;
	}

	// StatsModifier -> ()
	apply(other: StatsModifier)
	{
		this.damageBase *= other.damageBase;
		this.damageFire *= other.damageFire;
		this.damageIce *= other.damageIce;
		this.castTimeBase *= other.castTimeBase;
		this.castTimeFire *= other.castTimeFire;
		this.castTimeIce *= other.castTimeIce;
		this.spellRecastTimeScale *= other.spellRecastTimeScale;
		this.manaCostFire *= other.manaCostFire;
		this.manaCostIce *= other.manaCostIce;
		this.CH *= other.CH;
		this.DH *= other.DH;

		this.manaRegen += other.manaRegen;
		this.uhConsumption += other.uhConsumption;
	}

	static base()
	{
		let ret = new StatsModifier();
		ret.manaRegen = 200;
		return ret;
	}

	// FIXME
	static fromResourceState(resources: ResourceState)
	{
		let base = StatsModifier.base();
		let modifiers = [];

		// umbral ice
		let ui = resources.get(ResourceType.UmbralIce);
		let uiMod = new StatsModifier();
		if (ui.availableAmount() === 1) {
			uiMod.manaRegen = 3000;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.9;
			uiMod.manaCostIce = 0.75;
		} else if (ui.availableAmount() === 2) {
			uiMod.manaRegen = 4500;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.8;
			uiMod.manaCostIce = 0.5;
		} else if (ui.availableAmount() === 3) {
			uiMod.manaRegen = 6000;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.7;
			uiMod.manaCostIce = 0;
			uiMod.castTimeFire = 0.5;
		}
		modifiers.push(uiMod);

		// astral fire & umbral hearts
		let af = resources.get(ResourceType.AstralFire);
		let uhStacks = resources.get(ResourceType.UmbralHeart).availableAmount();
		let afMod = new StatsModifier();
		if (af.availableAmount() === 1) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.damageFire = 1.4;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.9;
		} else if (af.availableAmount() === 2) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.damageFire = 1.6;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.8;
		} else if (af.availableAmount() === 3) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.damageFire = 1.8;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.7;
			afMod.castTimeIce = 0.5;
		}
		modifiers.push(afMod);

		// ley lines
		let ll = resources.get(ResourceType.LeyLines);
		let spsMod = new StatsModifier();
		spsMod.castTimeBase = 1;
		spsMod.spellRecastTimeScale = 1;
		if (ll.available(1)) { // 15% reduction
			spsMod.castTimeBase = 0.85;
			spsMod.spellRecastTimeScale = 0.85;
		}

		let hasteMod = 0.01 * resources.game.config.hasteStacks; //1% gcd reduction per haste level
		let oldCastBase = spsMod.castTimeBase;
		let oldRecastBase = spsMod.spellRecastTimeScale;
		spsMod.castTimeBase = oldCastBase - hasteMod;
		spsMod.spellRecastTimeScale = oldRecastBase - hasteMod;

		if(resources.get(ResourceType.Dervish).available(1)){ //1% gcd bonus
			let oldCastBase = spsMod.castTimeBase;
			let oldRecastBase = spsMod.spellRecastTimeScale;
			spsMod.castTimeBase = oldCastBase - 0.1;
			spsMod.spellRecastTimeScale = oldRecastBase - 0.1;
		}


		modifiers.push(spsMod);

		let enoMod = new StatsModifier();
		if (resources.get(ResourceType.Enochian).available(1) && !Debug.noEnochian) {
			enoMod.damageBase = 1.2;
		}
		modifiers.push(enoMod);

		//======== combine and return ========

		modifiers.forEach(mod=>{ base.apply(mod); });
		return base;
	}
}