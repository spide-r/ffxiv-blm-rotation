import {Debug, ResourceType} from "./Common"
import {ResourceState} from "./Resources";

export class StatsModifier
{
	castTimeBase = 1;
	castTimeFire = 1;
	castTimeIce = 1;
	spellRecastTimeScale = 1;
	manaCostFire = 1;
	manaCostIce = 1;
	llApplied = false;
	manaRegen = 0;
	uhConsumption = 0;

	reset()
	{
		this.castTimeBase = 1;
		this.castTimeFire = 1;
		this.castTimeIce = 1;
		this.spellRecastTimeScale = 1;
		this.manaCostFire = 1;
		this.manaCostIce = 1;

		// additive constant
		this.manaRegen = 0;
		this.uhConsumption = 0;

		// OR
		this.llApplied = false;
	}

	// StatsModifier -> ()
	apply(other: StatsModifier)
	{
		this.castTimeBase *= other.castTimeBase;
		this.castTimeFire *= other.castTimeFire;
		this.castTimeIce *= other.castTimeIce;
		this.spellRecastTimeScale *= other.spellRecastTimeScale;
		this.manaCostFire *= other.manaCostFire;
		this.manaCostIce *= other.manaCostIce;

		this.manaRegen += other.manaRegen;
		this.uhConsumption += other.uhConsumption;

		this.llApplied = this.llApplied || other.llApplied;
	}

	static base()
	{
		let ret = new StatsModifier();
		ret.manaRegen = 200;
		return ret;
	}

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
			uiMod.manaCostIce = 0.75;
		} else if (ui.availableAmount() === 2) {
			uiMod.manaRegen = 4500;
			uiMod.manaCostFire = 0;
			uiMod.manaCostIce = 0.5;
		} else if (ui.availableAmount() === 3) {
			uiMod.manaRegen = 6000;
			uiMod.manaCostFire = 0;
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
			afMod.manaCostIce = 0;
		} else if (af.availableAmount() === 2) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.manaCostIce = 0;
		} else if (af.availableAmount() === 3) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.manaCostIce = 0;
			afMod.castTimeIce = 0.5;
		}
		modifiers.push(afMod);

		// ley lines
		let ll = resources.get(ResourceType.LeyLines);
		let llMod = new StatsModifier();
		llMod.castTimeBase = 1;
		llMod.spellRecastTimeScale = 1;
		if (ll.available(1)) {
			llMod.castTimeBase = 0.85;
			llMod.spellRecastTimeScale = 0.85;
			llMod.llApplied = true;
		}

		let hasteMod = 0.01 * resources.game.config.hasteStacks; //1% gcd reduction per haste level
		let oldCastBase = llMod.castTimeBase;
		let oldRecastBase = llMod.spellRecastTimeScale;
		llMod.castTimeBase = oldCastBase - hasteMod;
		llMod.spellRecastTimeScale = oldRecastBase - hasteMod;

		if(resources.get(ResourceType.Dervish).available(1)){ //1% gcd reduction
			let oldCastBase = llMod.castTimeBase;
			let oldRecastBase = llMod.spellRecastTimeScale;
			llMod.castTimeBase = oldCastBase - 0.1;
			llMod.spellRecastTimeScale = oldRecastBase - 0.1;
		}


		modifiers.push(llMod);

		//======== combine and return ========

		modifiers.forEach(mod=>{ base.apply(mod); });
		return base;
	}
}