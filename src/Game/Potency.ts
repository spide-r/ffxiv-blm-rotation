import {Aspect, Debug, ResourceType, SkillName} from "./Common";
import {ResourceState} from "./Resources";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, VALOR, ESSENCE, BANNER, EXTERNAL
}

export type PotencyModifier = {
	factor: number,
	source: PotencyModifierType
}

export function getPotencyModifiersFromResourceState(resources: ResourceState, aspect: Aspect) : PotencyModifier[] {
	let mods : PotencyModifier[] = [];
	// pot
	if (resources.get(ResourceType.Tincture).available(1)) {
		mods.push({source: PotencyModifierType.POT, factor: 1});
	}

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, factor: 1.23});
	}

	// ui1
	let ui = resources.get(ResourceType.UmbralIce);
	if (ui.availableAmount() === 1) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI1, factor: 0.9});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI1, factor: 1});
	}
	// ui2
	else if (ui.availableAmount() === 2) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI2, factor: 0.8});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI2, factor: 1});
	}
	// ui3
	else if (ui.availableAmount() === 3) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI3, factor: 0.7});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI3, factor: 1});
	}

	// af1
	let af = resources.get(ResourceType.AstralFire);
	if (af.availableAmount() === 1) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF1, factor: 0.9});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF1, factor: 1.4});
		}
	}
	// af2
	else if (af.availableAmount() === 2) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF2, factor: 0.8});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF2, factor: 1.6});
		}
	}
	// af3
	else if (af.availableAmount() === 3) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF3, factor: 0.7});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF3, factor: 1.8});
		}
	}

	// Bozja
	let val_mod = getValorModifier(resources);
	let essence_mod = getEssenceModifier(resources);
	let banner_mod = getBannerModifier(resources);
	let ext_buff_mod = getExternalBuffModifier(resources);
	mods.push({source: PotencyModifierType.VALOR, factor: val_mod})
	mods.push({source: PotencyModifierType.ESSENCE, factor: essence_mod})
	mods.push({source: PotencyModifierType.BANNER, factor: banner_mod})
	mods.push({source: PotencyModifierType.EXTERNAL, factor: ext_buff_mod})

	return mods;
}

function getValorModifier(rsc: ResourceState){ //+3% per stack

	let valor = rsc.game.config.valor;
	let mod = .03 * valor;
	mod += 1;
	return mod;
}

function getEssenceModifier(rsc: ResourceState){
	if(rsc.get(ResourceType.Elder).available(1)){
		return 1.5;
	} else if (rsc.get(ResourceType.Reg_Skirmisher).available(1)){
		return 1.2;
	} else if (rsc.get(ResourceType.Skirmisher).available(1)){
		return 1.24;
	} else {
		return 1;
	}
}

function getBannerModifier(rsc: ResourceState){ //honored sac & noble ends
	let mod = 1;
	if(rsc.get(ResourceType.NobleEnds).available(1)){
		mod *= 1.50
	}
	if(rsc.get(ResourceType.HonoredSac).available(1)){
		mod *= 1.55
	}
	return mod;
}

function getExternalBuffModifier(rsc: ResourceState){ //dervish, bravery, excellence, magic burst, FoM, (high-wire)
	let mod = 1;
	if(rsc.get(ResourceType.Excellence).available(1)){
		mod *= 1.65;
	}

	if(rsc.get(ResourceType.Dervish).available(1)){
		mod *= 1.07;
	}

	if(rsc.get(ResourceType.ten_Bravery).available(1) && rsc.get(ResourceType.five_Bravery).available(1)){
		mod *= 1.1; //pick higher number
	} else if(rsc.get(ResourceType.five_Bravery).available(1)){
		mod *= 1.05;
	} else if (rsc.get(ResourceType.ten_Bravery).available(1)){
		mod *= 1.1;
	}

	if(rsc.get(ResourceType.FoM).available(1)){
		mod *= 1.7; // WHOA MOMMA THAT'S A BIG BOY BUFF
	}

	if(rsc.get(ResourceType.MagicBurst).available(1)){
		mod *= 1.45;
	}

	return mod;
}



export type InitialPotencyProps = {
	sourceTime: number,
	sourceSkill: SkillName,
	aspect: Aspect,
	basePotency: number,
	snapshotTime?: number,
	description?: string,
}

export class Potency {
	sourceTime: number; // raw time (not display time)
	sourceSkill: SkillName;
	aspect: Aspect;
	description?: string;
	base: number;
	snapshotTime?: number;
	applicationTime?: number;
	modifiers: PotencyModifier[] = [];

	constructor(props: InitialPotencyProps) {
		this.sourceTime = props.sourceTime;
		this.sourceSkill = props.sourceSkill;
		this.aspect = props.aspect;
		this.base = props.basePotency;
		this.snapshotTime = props.snapshotTime;
		this.description = props.description;
	}

	getAmount(props: {
		tincturePotencyMultiplier: number,
	}) {
		let potency = this.base;
		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) potency *= props.tincturePotencyMultiplier;
			else potency *= m.factor;
		});
		return potency;
	}

	resolve(t: number) {
		console.assert(this.snapshotTime !== undefined);
		console.assert(this.applicationTime === undefined);
		this.applicationTime = t;
	}

	hasResolved() { return this.applicationTime !== undefined; }

	hasHitBoss(untargetable: (t: number) => boolean) {
		return this.applicationTime !== undefined && !untargetable(this.applicationTime);
	}

	hasSnapshotted() { return this.snapshotTime !== undefined; }
}