import {Aspect, ProcMode, ResourceType, SkillName} from './Common'
// @ts-ignore
import {controller} from "../Controller/Controller";
import {FoMBuff, LucidDreamingBuff, Resource} from "./Resources";
import {ActionNode} from "../Controller/Record";
import {GameState} from "./GameState";
import {getPotencyModifiersFromResourceState, Potency} from "./Potency";

export interface SkillCaptureCallbackInfo {
	capturedManaCost: number
}

export interface SkillApplicationCallbackInfo {

}

export class SkillInfo {
	readonly name: SkillName;
	readonly cdName: ResourceType;
	readonly aspect: Aspect;
	readonly isSpell: boolean;
	readonly baseCastTime: number;
	readonly baseManaCost: number;
	readonly basePotency: number;
	readonly skillApplicationDelay: number;

	constructor(
		skillName: SkillName,
		cdName: ResourceType,
		aspect: Aspect,
		isSpell: boolean,
		baseCastTime: number,
		baseManaCost: number,
		basePotency: number,
		skillApplicationDelay?: number)
	{
		this.name = skillName;
		this.cdName = cdName;
		this.aspect = aspect;
		this.isSpell = isSpell;
		this.baseCastTime = baseCastTime;
		this.baseManaCost = baseManaCost;
		this.basePotency = basePotency;
		this.skillApplicationDelay = skillApplicationDelay===undefined ? 0 : skillApplicationDelay;
	}
}

// ref logs
// https://www.fflogs.com/reports/KVgxmW9fC26qhNGt#fight=16&type=summary&view=events&source=6
// https://www.fflogs.com/reports/rK87bvMFN2R3Hqpy#fight=1&type=casts&source=7
const skillInfos = [
	new SkillInfo(SkillName.Blizzard, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 400, 180, 0.846),
	new SkillInfo(SkillName.Fire, ResourceType.cd_GCD, Aspect.Fire, true,
		2.5, 800, 180, 1.871),
	new SkillInfo(SkillName.Transpose, ResourceType.cd_Transpose, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.Thunder3, ResourceType.cd_GCD, Aspect.Lightning, true,
		2.5, 400, 50, 1.025),
	new SkillInfo(SkillName.Manaward, ResourceType.cd_Manaward, Aspect.Other, false,
		0, 0, 0, 1.114),// delayed
	new SkillInfo(SkillName.Manafont, ResourceType.cd_Manafont, Aspect.Other, false,
		0, 0, 0, 0.88),// delayed, test by manafont->desp from 0 mana
	new SkillInfo(SkillName.Fire3, ResourceType.cd_GCD, Aspect.Fire, true,
		3.5, 2000, 260, 1.292),
	new SkillInfo(SkillName.Blizzard3, ResourceType.cd_GCD, Aspect.Ice, true,
		3.5, 800, 260, 0.89),
	new SkillInfo(SkillName.Freeze, ResourceType.cd_GCD, Aspect.Ice, true,
		2.8, 1000, 120, 0.664),
	new SkillInfo(SkillName.Flare, ResourceType.cd_GCD, Aspect.Fire, true,
		4, 0, 280, 1.157), // mana is handled separately

	new SkillInfo(SkillName.LeyLines, ResourceType.cd_LeyLines, Aspect.Other, false,
		0, 0, 0, 0.49),// delayed
	new SkillInfo(SkillName.Sharpcast, ResourceType.cd_Sharpcast, Aspect.Other,false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.Blizzard4, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 800, 310, 1.156),
	new SkillInfo(SkillName.Fire4, ResourceType.cd_GCD, Aspect.Fire, true,
		2.8, 800, 310, 1.159),
	new SkillInfo(SkillName.BetweenTheLines, ResourceType.cd_BetweenTheLines, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.AetherialManipulation, ResourceType.cd_AetherialManipulation, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.Triplecast, ResourceType.cd_Triplecast, Aspect.Other, false,
		0, 0, 0), // instant

	new SkillInfo(SkillName.Foul, ResourceType.cd_GCD, Aspect.Other, true,
		0, 0, 600, 1.158),
	new SkillInfo(SkillName.Despair, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 0, 340, 0.556),
	new SkillInfo(SkillName.UmbralSoul, ResourceType.cd_GCD, Aspect.Ice, true,
		0, 0, 0),// ? (assumed to be instant)
	new SkillInfo(SkillName.Xenoglossy, ResourceType.cd_GCD, Aspect.Other, true,
		0, 0, 880, 0.63),

	new SkillInfo(SkillName.HighFire2, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 1500, 100, 1.154),
	new SkillInfo(SkillName.HighBlizzard2, ResourceType.cd_GCD, Aspect.Ice, true,
		3, 800, 100, 1.158),
	new SkillInfo(SkillName.Amplifier, ResourceType.cd_Amplifier, Aspect.Other, false,
		0, 0, 0), // ? (assumed to be instant)
	new SkillInfo(SkillName.Paradox, ResourceType.cd_GCD, Aspect.Other, true,
		2.5, 1600, 500, 0.624),

	new SkillInfo(SkillName.Addle, ResourceType.cd_Addle, Aspect.Other, false,
		0, 0, 0, 0.621),// delayed
	new SkillInfo(SkillName.Swiftcast, ResourceType.cd_Swiftcast, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.LucidDreaming, ResourceType.cd_LucidDreaming, Aspect.Other, false,
		0, 0, 0, 0.623), // delayed
	new SkillInfo(SkillName.Surecast, ResourceType.cd_Surecast, Aspect.Other, false,
		0, 0, 0), // surprisingly instant because arms length is not
	new SkillInfo(SkillName.Tincture, ResourceType.cd_Tincture, Aspect.Other, false,
		0, 0, 0, 0.891),// delayed
	new SkillInfo(SkillName.Sprint, ResourceType.cd_Sprint, Aspect.Other, false,
		0, 0, 0, 0.133), // delayed


	//Bozja
	new SkillInfo(SkillName.FlareStar, ResourceType.cd_GCD, Aspect.Other, true,
		5, 9000, 300, 0.1), //flare star will always take 5s

	new SkillInfo(SkillName.Chainspell, ResourceType.cd_Chainspell, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.FoM, ResourceType.cd_FoM, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.EtherKit, ResourceType.cd_EtherKit, Aspect.Other, false,
		0, 0, 0, 0.1),
	new SkillInfo(SkillName.Elixir, ResourceType.cd_Elixir, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.Excellence, ResourceType.cd_Excellence, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.Dervish, ResourceType.cd_Dervish, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.FoS, ResourceType.cd_FoS, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.full_uptime_bravery, ResourceType.cd_uptime_Bravery, Aspect.Other, false,
		0, 0, 0, 0.1), //full uptime c4

	new SkillInfo(SkillName.five_Bravery, ResourceType.cd_five_Bravery, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.ten_Bravery, ResourceType.cd_Ten_Bravery, Aspect.Other, false,
		0, 0, 0, 0.1),

	//Banners
	new SkillInfo(SkillName.HonoredSac, ResourceType.cd_HonoredSac, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.NobleEnds, ResourceType.cd_NobleEnds, Aspect.Other, false,
		0, 0, 0, 0.1),

	new SkillInfo(SkillName.Dispel, ResourceType.cd_GCD, Aspect.Other, true,
		2.5, 0, 0, 0.1),

	new SkillInfo(SkillName.Percept, ResourceType.cd_Percept, Aspect.Other, false,
		1.5, 0, 0, 0.1),

	//Essences
	new SkillInfo(SkillName.Reg_Skirmisher, ResourceType.cd_Reg_Skirmisher, Aspect.Other, false,
		0, 0, 0, 0.1),
	new SkillInfo(SkillName.Skirmisher, ResourceType.cd_Skirmisher, Aspect.Other, false,
		0, 0, 0, 0.1),
	new SkillInfo(SkillName.Watcher, ResourceType.cd_Watcher, Aspect.Other, false,
		0, 0, 0, 0.1),
	new SkillInfo(SkillName.Gambler, ResourceType.cd_Gambler, Aspect.Other, false,
		0, 0, 0, 0.1),
	new SkillInfo(SkillName.Elder, ResourceType.cd_Elder, Aspect.Other, false,
		0, 0, 0, 0.1),
];

const skillInfosMap: Map<SkillName, SkillInfo> = new Map();
skillInfos.forEach(info=>{
	skillInfosMap.set(info.name, info);
});

export class Skill {
	readonly name: SkillName;
	readonly available: () => boolean;
	readonly use: (game: GameState, node: ActionNode) => void;
	info: SkillInfo;

	constructor(name: SkillName, requirementFn: ()=>boolean, onApplication: (game: GameState, node: ActionNode)=>void) {
		this.name = name;
		this.available = requirementFn;
		this.use = onApplication;
		let info = skillInfosMap.get(name);
		if (!info) {
			info = skillInfos[0];
			console.error("Skill info not found!");
		}
		this.info = info;
	}
}

export class SkillsList extends Map<SkillName, Skill> {
	constructor(game: GameState) {
		super();

		let skillsList = this;

		let addResourceAbility = function(props: {
			skillName: SkillName,
			rscType: ResourceType,
			instant: boolean,
			duration: number
		}) {
			let takeEffect = (node: ActionNode) => {
				let resource = game.resources.get(props.rscType);
				if (resource.available(1)) {
					resource.overrideTimer(game, props.duration);
				} else {
					resource.gain(1);
					game.resources.addResourceEvent(
						props.rscType,
						"drop " + props.rscType, props.duration, (rsc: Resource) => {
							rsc.consume(1);
						});
				}
				node.resolveAll(game.time);
			};
			skillsList.set(props.skillName, new Skill(props.skillName,
				() => {
					return true;
				},
				(game, node) => {
					game.useInstantSkill({
						skillName: props.skillName,
						onCapture: props.instant ? ()=>takeEffect(node) : undefined,
						onApplication: props.instant ? undefined : ()=>takeEffect(node),
						dealDamage: false,
						node: node
					});
				}
			));
		}

		// Blizzard
		skillsList.set(SkillName.Blizzard, new Skill(SkillName.Blizzard,
			() => {
				return true;
			},
			(game: GameState, node: ActionNode) => {
				if (game.getFireStacks() === 0) // no AF
				{
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else // in AF
				{
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		let gainFirestarterProc = function(game: GameState) {
			let fs = game.resources.get(ResourceType.Firestarter);
			let duration = game.config.extendedBuffTimes ? 31 : 30;
			if (fs.available(1)) {
				fs.overrideTimer(game, duration);
			} else {
				fs.gain(1);
				game.resources.addResourceEvent(
					ResourceType.Firestarter,
					"drop firestarter proc", duration, (rsc: Resource)=>{
						rsc.consume(1);
					});
			}
		}

		let potentiallyGainFirestarter = function(game: GameState) {
			// firestarter
			let sc = game.resources.get(ResourceType.Sharpcast);
			if (sc.available(1)) {
				gainFirestarterProc(game);
				sc.consume(1);
				sc.removeTimer();
			} else {
				let rand = game.rng(); // firestarter proc
				if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) gainFirestarterProc(game);
			}
		}

		// Fire
		skillsList.set(SkillName.Fire, new Skill(SkillName.Fire,
			() => {
				return true;
			},
			(game, node) => {
				if (game.getIceStacks() === 0) { // in fire or no enochian
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.AstralFire).gain(1);
						game.startOrRefreshEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else {
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Transpose
		skillsList.set(SkillName.Transpose, new Skill(SkillName.Transpose,
			() => {
				return game.getFireStacks() > 0 || game.getIceStacks() > 0; // has UI or AF
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Transpose,
					onCapture: () => {
						if (game.getFireStacks() === 0 && game.getIceStacks() === 0) {
							return;
						}
						if (game.getFireStacks() > 0) {
							game.switchToAForUI(ResourceType.UmbralIce, 1);
						} else {
							game.switchToAForUI(ResourceType.AstralFire, 1);
						}
						game.startOrRefreshEnochian();
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.time);
			}
		));

		// Ley Lines
		addResourceAbility({
			skillName: SkillName.LeyLines,
			rscType: ResourceType.LeyLines,
			instant: false,
			duration: 30});

		let gainThundercloudProc = function (game: GameState) {
			let thundercloud = game.resources.get(ResourceType.Thundercloud);
			let duration = game.config.extendedBuffTimes ? 41 : 40;
			if (thundercloud.available(1)) { // already has a proc; reset its timer
				thundercloud.overrideTimer(game, duration);
			} else { // there's currently no proc. gain one.
				thundercloud.gain(1);
				game.resources.addResourceEvent(
					ResourceType.Thundercloud,
					"drop thundercloud proc", duration, (rsc: Resource) => {
						rsc.consume(1);
					});
			}
		}

		// called at the time of APPLICATION (not snapshot)
		let applyThunderDoT = function(game: GameState, node: ActionNode) {
			// define stuff
			let recurringThunderTick = (remainingTicks: number)=> {
				if (remainingTicks===0) return;
				game.resources.addResourceEvent(
					ResourceType.ThunderDoTTick,
					"recurring thunder tick", 3, (rsc: Resource) =>{
						let idx = 10 - remainingTicks + 1;
						let p = node.getPotencies()[idx];
						controller.resolvePotency(p);

						if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && game.rng() < 0.1)) {// thundercloud proc
							gainThundercloudProc(game);
						}
						recurringThunderTick(remainingTicks - 1);
					});
			};
			let dot = game.resources.get(ResourceType.ThunderDoT);
			let tick = game.resources.get(ResourceType.ThunderDoTTick);
			// if already has thunder applied; cancel the remaining ticks now.
			dot.removeTimer();
			tick.removeTimer();
			// for all existing T3, remove unapplied potencies
			// NOTE: can't simply iterateAll here because want to bail out once we reach the currently applying node
			let itr = controller.record.getFirstAction();
			while (itr) {
				if (itr === node) break;
				if (itr.skillName === SkillName.Thunder3) {
					itr.removeUnresolvedPotencies();
				}
				itr = itr.next;
			}
			// order of events: gain buff, add "remove" event,
			dot.gain(1);
			game.resources.addResourceEvent(ResourceType.ThunderDoT, "drop DoT", 30, (dot: Resource)=>{
				dot.consume(1);
			});
			// what this function does: wait for 3s and do a tick
			recurringThunderTick(10);
		};

		let addT3Potencies = function(node: ActionNode, includeInitial: boolean) {
			let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Lightning);
			if (includeInitial) {
				// initial potency
				let pInitial = new Potency({
					sourceTime: game.time,
					sourceSkill: SkillName.Thunder3,
					aspect: Aspect.Lightning,
					basePotency: 50,
					snapshotTime: undefined,
				});
				pInitial.modifiers = mods;
				node.addPotency(pInitial);
			}
			// dots
			for (let i = 0; i < 10; i++) {
				let pDot = new Potency({
					sourceTime: game.time,
					sourceSkill: SkillName.Thunder3,
					aspect: Aspect.Lightning,
					basePotency: game.config.adjustedDoTPotency(35),
					snapshotTime: undefined,
					description: "DoT " + (i+1) + "/10"
				});
				pDot.modifiers = mods;
				node.addPotency(pDot);
			}
		}

		// Thunder 3
		skillsList.set(SkillName.Thunder3, new Skill(SkillName.Thunder3,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Thundercloud).available(1)) // made instant via thundercloud
				{
					// potency
					addT3Potencies(node, true);
					let p0 = node.getPotencies()[0];
					p0.base = 400;
					node.getPotencies().forEach(p=>{ p.snapshotTime = game.time; });

					// tincture
					if (game.resources.get(ResourceType.Tincture).available(1)) {
						node.addBuff(ResourceType.Tincture);
					}

					game.useInstantSkill({
						skillName: SkillName.Thunder3,
						onApplication: () => {
							controller.resolvePotency(p0);
							applyThunderDoT(game, node);
						},
						dealDamage: false,
						node: node
					});
					let thundercloud = game.resources.get(ResourceType.Thundercloud);
					thundercloud.consume(1);
					thundercloud.removeTimer();
					// if there's a sharpcast stack, consume it and gain (a potentially new) proc
					let sc = game.resources.get(ResourceType.Sharpcast);
					if (sc.available(1)) {
						gainThundercloudProc(game);
						sc.consume(1);
						sc.removeTimer();
					}
				} else {
					game.castSpell({skillName: SkillName.Thunder3, onButtonPress: () => {
							// potency
							addT3Potencies(node, false);
						}, onCapture: (cap: SkillCaptureCallbackInfo) => {

						// potency snapshot time
						node.getPotencies().forEach(p=>{ p.snapshotTime = game.time });

						// tincture
						if (game.resources.get(ResourceType.Tincture).available(1)) {
							node.addBuff(ResourceType.Tincture);
						}
						// if there's a sharpcast stack, consume it and gain (a potentially new) proc
						let sc = game.resources.get(ResourceType.Sharpcast);
						if (sc.available(1)) {
							gainThundercloudProc(game);
							sc.consume(1);
							sc.removeTimer();
						}
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
						applyThunderDoT(game, node);
					}, node: node});
				}
			}
		));

		// Manaward
		addResourceAbility({skillName: SkillName.Manaward, rscType: ResourceType.Manaward, instant: false, duration: 20});

		// Manafont
		skillsList.set(SkillName.Manafont, new Skill(SkillName.Manafont,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Manafont,
					onApplication: () => {
						game.resources.get(ResourceType.Mana).gain(3000);
						node.resolveAll(game.time);
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Fire 3
		skillsList.set(SkillName.Fire3, new Skill(SkillName.Fire3,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Firestarter).available(1)) {
					game.useInstantSkill({
						skillName: SkillName.Fire3,
						dealDamage: true,
						node: node
					});
					game.switchToAForUI(ResourceType.AstralFire, 3);
					game.startOrRefreshEnochian();
					game.resources.get(ResourceType.Firestarter).consume(1);
					game.resources.get(ResourceType.Firestarter).removeTimer();
				} else {
					game.castSpell({skillName: SkillName.Fire3, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Blizzard 3
		skillsList.set(SkillName.Blizzard3, new Skill(SkillName.Blizzard3,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard3, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Freeze
		skillsList.set(SkillName.Freeze, new Skill(SkillName.Freeze,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Freeze, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Flare
		skillsList.set(SkillName.Flare, new Skill(SkillName.Flare,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Flare, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let uh = game.resources.get(ResourceType.UmbralHeart);
					let mana = game.resources.get(ResourceType.Mana);
					let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
					// mana
					game.resources.get(ResourceType.Mana).consume(manaCost);
					uh.consume(uh.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
						if(game.resources.get(ResourceType.EtherKit).available(1)){ //ether kit available - mana is now 0
							//burn etherkit - add 5000 MP if below 2000
							if(mana.availableAmount() < 2000){
								game.resources.get(ResourceType.EtherKit).consume(1);
								if(game.resources.get(ResourceType.EtherKit).availableAmount() === 0){
									game.resources.get(ResourceType.EtherKit).removeTimer();
								}
								game.resources.get(ResourceType.Mana).gain(5000);
							}
						}
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Sharpcast
		addResourceAbility({skillName: SkillName.Sharpcast, rscType: ResourceType.Sharpcast, instant: true, duration: 30});

		// Blizzard 4
		skillsList.set(SkillName.Blizzard4, new Skill(SkillName.Blizzard4,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard4, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Fire 4
		skillsList.set(SkillName.Fire4, new Skill(SkillName.Fire4,
			() => {
				return game.getFireStacks() > 0; // in AF
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Fire4, onCapture: (cap: SkillCaptureCallbackInfo) => {
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Between the Lines
		skillsList.set(SkillName.BetweenTheLines, new Skill(SkillName.BetweenTheLines,
			() => {
				let ll = game.resources.get(ResourceType.LeyLines);
				let cachedEnabled = ll.enabled;
				ll.enabled = true;
				let hasLL = ll.available(1); // gets raw amount
				ll.enabled = cachedEnabled;
				return hasLL;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.BetweenTheLines,
					dealDamage: false,
					onCapture: ()=>{node.resolveAll(game.time)},
					node: node
				});
			}
		));

		// Aetherial Manipulation
		skillsList.set(SkillName.AetherialManipulation, new Skill(SkillName.AetherialManipulation,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.AetherialManipulation,
					dealDamage: false,
					onCapture: ()=>{node.resolveAll(game.time)},
					node: node
				});
			}
		));

		// Triplecast
		skillsList.set(SkillName.Triplecast, new Skill(SkillName.Triplecast,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Triplecast,
					onCapture: () => {
						let triple = game.resources.get(ResourceType.Triplecast);
						if (triple.pendingChange) triple.removeTimer(); // should never need this, but just in case
						triple.gain(3);
						game.resources.addResourceEvent(
							ResourceType.Triplecast,
							"drop remaining Triple charges", game.config.extendedBuffTimes ? 15.7 : 15, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
						node.resolveAll(game.time);
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Foul
		skillsList.set(SkillName.Foul, new Skill(SkillName.Foul,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				game.resources.get(ResourceType.Polyglot).consume(1);
				game.useInstantSkill({
					skillName: SkillName.Foul,
					dealDamage: true,
					node: node
				});
			}
		));

		// Despair
		skillsList.set(SkillName.Despair, new Skill(SkillName.Despair,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Despair, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let mana = game.resources.get(ResourceType.Mana);
					// mana
					mana.consume(mana.availableAmount());
					if(game.resources.get(ResourceType.EtherKit).available(1)){ //ether kit available - mana is now 0
							//burn etherkit - add 5000 MP
						game.resources.get(ResourceType.EtherKit).consume(1);
						if(game.resources.get(ResourceType.EtherKit).availableAmount() === 0){
							game.resources.get(ResourceType.EtherKit).removeTimer();
						}
						game.resources.get(ResourceType.Mana).gain(5000);
					}
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Umbral Soul
		skillsList.set(SkillName.UmbralSoul, new Skill(SkillName.UmbralSoul,
			() => {
				return game.getIceStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.UmbralSoul,
					onCapture: () => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.resources.get(ResourceType.UmbralHeart).gain(1);
						game.startOrRefreshEnochian();
						node.resolveAll(game.time);
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Xenoglossy
		skillsList.set(SkillName.Xenoglossy, new Skill(SkillName.Xenoglossy,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				game.resources.get(ResourceType.Polyglot).consume(1);
				game.useInstantSkill({
					skillName: SkillName.Xenoglossy,
					dealDamage: true,
					node: node
				});
			}
		));

		// High Fire 2
		skillsList.set(SkillName.HighFire2, new Skill(SkillName.HighFire2,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.HighFire2, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.AstralFire, 3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// High Blizzard 2
		skillsList.set(SkillName.HighBlizzard2, new Skill(SkillName.HighBlizzard2,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.HighBlizzard2, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Amplifier
		skillsList.set(SkillName.Amplifier, new Skill(SkillName.Amplifier,
			() => {
				return game.getIceStacks() > 0 || game.getFireStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Amplifier,
					onCapture: () => {
						game.resources.get(ResourceType.Polyglot).gain(1);
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.time);
			}
		));

		// Paradox
		skillsList.set(SkillName.Paradox, new Skill(SkillName.Paradox,
			() => {
				return game.resources.get(ResourceType.Paradox).available(1);
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Paradox, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.Paradox).consume(1);
					// enochian (refresh only
					if (game.hasEnochian()) {
						game.startOrRefreshEnochian();
					}
					if (game.getIceStacks() > 0) {
						game.resources.get(ResourceType.UmbralIce).gain(1);
					}
					if (game.getFireStacks() > 0) {// firestarter proc
						game.resources.get(ResourceType.AstralFire).gain(1);
						potentiallyGainFirestarter(game);
					}
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Addle
		addResourceAbility({skillName: SkillName.Addle, rscType: ResourceType.Addle, instant: false, duration: 10});

		// Swiftcast
		addResourceAbility({skillName: SkillName.Swiftcast, rscType: ResourceType.Swiftcast, instant: true, duration: 10});

		// Lucid Dreaming
		skillsList.set(SkillName.LucidDreaming, new Skill(SkillName.LucidDreaming,
			() => { return true; },
			(game, node) => {
				const skillTime = game.getDisplayTime();
				game.useInstantSkill({
					skillName: SkillName.LucidDreaming,
					onApplication: () => {
						let lucid = game.resources.get(ResourceType.LucidDreaming) as LucidDreamingBuff;
						if (lucid.available(1)) {
							lucid.overrideTimer(game, 21);
						} else {
							lucid.gain(1);
							game.resources.addResourceEvent(
								ResourceType.LucidDreaming,
								"drop lucid dreaming", 21, (rsc: Resource) => {
									rsc.consume(1);
								});
						}
						lucid.sourceSkill = "Lucid@"+skillTime.toFixed(2);
						lucid.tickCount = 0;
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.time);
			}))

		// Surecast
		addResourceAbility({skillName: SkillName.Surecast, rscType: ResourceType.Surecast, instant: true, duration: 10});

		// Tincture
		addResourceAbility({skillName: SkillName.Tincture, rscType: ResourceType.Tincture, instant: false, duration: 30});

		// Sprint
		addResourceAbility({skillName: SkillName.Sprint, rscType: ResourceType.Sprint, instant: false, duration: 10});

		//Chainspell
		skillsList.set(SkillName.Chainspell, new Skill(SkillName.Chainspell,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Chainspell,
					onApplication: () => {
						let chain = ResourceType.Chainspell;
						let chainDuration = 30;
						if(game.resources.get(ResourceType.Watcher).available(1)){
							chainDuration = 90;
						}

						let resource = game.resources.get(chain);
						if (resource.available(1)) {
							resource.overrideTimer(game, chainDuration);
						} else {
							resource.gain(1);
							game.resources.addResourceEvent(
								chain,
								"drop " + chain, chainDuration, (rsc: Resource) => {
									rsc.consume(1);
								});
						}

						let mburst = game.resources.get(ResourceType.MagicBurst);
						if (mburst.available(1)) {
							mburst.overrideTimer(game, 30);
						} else {
							mburst.gain(1);
							game.resources.addResourceEvent(
								ResourceType.MagicBurst,
								"drop " + mburst, 30, (rsc: Resource) => {
									rsc.consume(1);
								});
						}
					},
					dealDamage: false,
					node: node
				});
			}
		));


		// FoM
		skillsList.set(SkillName.FoM, new Skill(SkillName.FoM,
			() => { return true; },
			(game, node) => {
				const skillTime = game.getDisplayTime();
				game.useInstantSkill({
					skillName: SkillName.FoM,
					onApplication: () => {
						let FoM = game.resources.get(ResourceType.FoM) as FoMBuff;
						if (FoM.available(1)) {
							FoM.overrideTimer(game, 21);
						} else {
							FoM.gain(1);
							game.resources.addResourceEvent(
								ResourceType.FoM,
								"drop FoM", 21, (rsc: Resource) => {
									rsc.consume(1);
								});
						}
						FoM.sourceSkill = "FoM@"+skillTime.toFixed(2);
						FoM.tickCount = 0;
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.time);
			}))



		//FlareStar
		let addFSPotencies = function(node: ActionNode, includeInitial: boolean) {
			let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Other);
			if (includeInitial) {
				// initial potency
				let pInitial = new Potency({
					sourceTime: game.time,
					sourceSkill: SkillName.FlareStar,
					aspect: Aspect.Other,
					basePotency: 350,
					snapshotTime: undefined,
				});
				pInitial.modifiers = mods;
				node.addPotency(pInitial);
			}
			// dots
			for (let i = 0; i < 20; i++) { //60s = 20 ticks
				let pDot = new Potency({
					sourceTime: game.time,
					sourceSkill: SkillName.FlareStar,
					aspect: Aspect.Other,
					basePotency: game.config.adjustedDoTPotency(350),
					snapshotTime: undefined,
					description: "FSDoT " + (i+1) + "/20"
				});
				pDot.modifiers = mods;
				node.addPotency(pDot);
			}
		}


		skillsList.set(SkillName.FlareStar, new Skill(SkillName.FlareStar,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Thundercloud).available(1)) // made instant via thundercloud
				{
					// potency
					addFSPotencies(node, true);
					let p0 = node.getPotencies()[0];
					p0.base = 350;
					node.getPotencies().forEach(p=>{ p.snapshotTime = game.time; });

					// tincture
					if (game.resources.get(ResourceType.Tincture).available(1)) {
						node.addBuff(ResourceType.Tincture);
					}
					hackyDrainMP(9000, SkillName.FlareStar)
					game.useInstantSkill({
						skillName: SkillName.FlareStar,
						onApplication: () => {
							controller.resolvePotency(p0);
							applyThunderDoT(game, node);
						},
						dealDamage: false,
						node: node
					});
				}
			}

		));

		let hackyDrainMP = function (baseManaCost: number, skillName: SkillName) {
			let [capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(Aspect.Other, baseManaCost);

			if (!(skillName === SkillName.Paradox && game.getIceStacks() > 0)) {
				game.resources.get(ResourceType.Mana).consume(capturedManaCost);
			}

			if (game.resources.get(ResourceType.EtherKit).available(1)) { //ether kit available
				if (game.resources.get(ResourceType.Mana).availableAmount() < 2000) {
					//burn etherkit - add 5000 MP
					game.resources.get(ResourceType.EtherKit).consume(1);
					if (game.resources.get(ResourceType.EtherKit).availableAmount() === 0) {
						game.resources.get(ResourceType.EtherKit).removeTimer();
					}
					game.resources.get(ResourceType.Mana).gain(5000);

				}

			}
		}


		// Ether Kit
		skillsList.set(SkillName.EtherKit, new Skill(SkillName.EtherKit,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.EtherKit,
					onApplication: () => {
						let charges = game.config.etherCharges;
						let etherKit = game.resources.get(ResourceType.EtherKit);
						if (etherKit.pendingChange) etherKit.removeTimer(); // should never need this, but just in case
						etherKit.gain(charges);
						game.resources.addResourceEvent(
							ResourceType.EtherKit,
							"drop remaining etherkit charges", 10 * 60, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));


		//Elixir
		skillsList.set(SkillName.Elixir, new Skill(SkillName.Elixir,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Elixir,
					onApplication: () => {
						let mana = game.resources.get(ResourceType.Mana);
						mana.overrideCurrentValue(mana.maxValue);
					},
					dealDamage: false,
					node: node
				});
			}
		));


		// Regular Skirmisher
		skillsList.set(SkillName.Reg_Skirmisher, new Skill(SkillName.Reg_Skirmisher,
			() => {
				return true;
			},
			(game, node) => {
				applyEssence(ResourceType.Reg_Skirmisher, SkillName.Reg_Skirmisher, game, node)
			}
		));

		// Gambler
		skillsList.set(SkillName.Gambler, new Skill(SkillName.Gambler,
			() => {
				return true;
			},
			(game, node) => {
				applyEssence(ResourceType.Gambler, SkillName.Skirmisher, game, node)
			}
		));

		// Skirmisher
		skillsList.set(SkillName.Skirmisher, new Skill(SkillName.Skirmisher,
			() => {
				return true;
			},
			(game, node) => {
				applyEssence(ResourceType.Skirmisher, SkillName.Skirmisher, game, node)
			}
		));

		// Elder
		skillsList.set(SkillName.Elder, new Skill(SkillName.Elder,
			() => {
				return true;
			},
			(game, node) => {
				applyEssence(ResourceType.Elder, SkillName.Elder, game, node )
			}
		));

		// Watcher
		skillsList.set(SkillName.Watcher, new Skill(SkillName.Watcher,
			() => {
				return true;
			},
			(game, node) => {
				applyEssence(ResourceType.Watcher, SkillName.Watcher, game, node)
			}
		));
		addResourceAbility({skillName: SkillName.Dervish, rscType: ResourceType.Dervish, instant: false, duration: 60});
		addResourceAbility({skillName: SkillName.Excellence, rscType: ResourceType.Excellence, instant: false, duration: 60});

		skillsList.set(SkillName.ten_Bravery, new Skill(SkillName.ten_Bravery,
			() => {
				let five_bravery_used = game.resources.get(ResourceType.five_Bravery).available(1);
				return !five_bravery_used; //if 5% bravery is not up - fire this off
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.ten_Bravery,
					onApplication: () => {
						let braveryRsc = game.resources.get(ResourceType.ten_Bravery);
						if (braveryRsc.pendingChange) braveryRsc.removeTimer(); // should never need this, but just in case
						braveryRsc.gain(1);
						game.resources.addResourceEvent(
							ResourceType.ten_Bravery,
							"drop bravery", 60, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));
		skillsList.set(SkillName.five_Bravery, new Skill(SkillName.five_Bravery,
			() => {
				let ten_bravery_used = game.resources.get(ResourceType.ten_Bravery).available(1);
				return !ten_bravery_used; //if 10% bravery is not up - fire this off
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.five_Bravery,
					onApplication: () => {
						let braveryRsc = game.resources.get(ResourceType.five_Bravery);
						if (braveryRsc.pendingChange) braveryRsc.removeTimer(); // should never need this, but just in case
						braveryRsc.gain(1);
						game.resources.addResourceEvent(
							ResourceType.five_Bravery,
							"drop bravery", 10 * 60, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));

		skillsList.set(SkillName.full_uptime_bravery, new Skill(SkillName.ten_Bravery,
			() => {
			let five_bravery_used = game.resources.get(ResourceType.five_Bravery).available(1);
				return !five_bravery_used; //if 5% bravery is not up - fire this off
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.full_uptime_bravery,
					onApplication: () => {
						let braveryRsc = game.resources.get(ResourceType.ten_Bravery);
						if (braveryRsc.pendingChange) braveryRsc.removeTimer(); // should never need this, but just in case
						braveryRsc.gain(1);
						game.resources.addResourceEvent(
							ResourceType.ten_Bravery,
							"drop bravery", 10 * 60, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));

		skillsList.set(SkillName.FoS, new Skill(SkillName.FoS,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.FoS,
					onApplication: () => {
					resetCooldowns();
					},
					dealDamage: false,
					node: node
				});
			}
		));

		function resetCooldowns(){
			let cooldowns = [ResourceType.cd_LeyLines, ResourceType.cd_Sharpcast, ResourceType.cd_BetweenTheLines,
				ResourceType.cd_LucidDreaming, ResourceType.cd_Swiftcast, ResourceType.cd_Triplecast, ResourceType.cd_Manafont,
				ResourceType.cd_Surecast, ResourceType.cd_Addle, ResourceType.cd_Manaward]
			Object.values(cooldowns).forEach(cc => {
				let cd = game.cooldowns.get(cc)
				let currentStackCd = cd.currentStackCd();
				cd.overrideCurrentValue(currentStackCd); // this should effectively reset the cooldown
			})
			//triplecast needs special case since it has 2 stacks
			let tc = game.resources.get(ResourceType.cd_Triplecast);
			let amt = 2;
			tc.gain(amt);
		}

		skillsList.set(SkillName.HonoredSac, new Skill(SkillName.HonoredSac,
			() => {
				let noble_ends_active = game.resources.get(ResourceType.NobleEnds).available(1);
				return !noble_ends_active; //if noble ends is not up - fire this off
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.HonoredSac,
					onApplication: () => {
						let hsacRSC = game.resources.get(ResourceType.HonoredSac);
						if (hsacRSC.pendingChange) hsacRSC.removeTimer(); // should never need this, but just in case
						hsacRSC.gain(1);
						game.resources.addResourceEvent(
							ResourceType.HonoredSac,
							"drop hsac", 15, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));

		skillsList.set(SkillName.Dispel, new Skill(SkillName.Dispel,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Dispel, onCapture: (cap: SkillCaptureCallbackInfo) => {
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
			}
		));

		skillsList.set(SkillName.NobleEnds, new Skill(SkillName.NobleEnds,
			() => {
				let honored_sac_active = game.resources.get(ResourceType.HonoredSac).available(1);
				return !honored_sac_active; //if noble ends is not up - fire this off
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.NobleEnds,
					onApplication: () => {
						let hsacRSC = game.resources.get(ResourceType.NobleEnds);
						if (hsacRSC.pendingChange) hsacRSC.removeTimer(); // should never need this, but just in case
						hsacRSC.gain(1);
						game.resources.addResourceEvent(
							ResourceType.NobleEnds,
							"drop hsac", 15, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
					},
					dealDamage: false,
					node: node
				});
			}
		));


		skillsList.set(SkillName.Percept, new Skill(SkillName.Percept,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Percept,
					onApplication: () => {},
					dealDamage: false,
					node: node
				});
			}
		));



		function applyEssence(essenceRsc: ResourceType, essenceSkill: SkillName, game: GameState, node: ActionNode) {
			const essences = [ResourceType.Skirmisher, ResourceType.Gambler, ResourceType.Reg_Skirmisher, ResourceType.Elder, ResourceType.Watcher];
			essences.forEach(function (essence, index) {
				if(game.resources.get(essence).availableAmount() > 0){
					// other essence found - drop it
					let activeEssence = game.resources.get(essence);
					activeEssence.removeTimer()
					activeEssence.consume(activeEssence.availableAmount())
				}
			})

					game.useInstantSkill({
						skillName: essenceSkill,
						onApplication: () => {
							let resource = game.resources.get(essenceRsc);
							if (resource.available(1)) {
								resource.overrideTimer(game, 10 * 60);
							} else {
								resource.gain(1);
								game.resources.addResourceEvent(
									essenceRsc,
									"drop essence charges", 10 * 60, (rsc: Resource) => { // 10 min charge
										rsc.consume(rsc.availableAmount());
									});
							}
						},
						dealDamage: false,
						node: node
					});

		}



		return skillsList;
	}
	get(key: SkillName): Skill {
		let skill = super.get(key);
		if (skill) return skill;
		else {
			console.assert(false);
			return new Skill(
				SkillName.Never,
				()=>{return false},
				(game: GameState, node: ActionNode)=>{});
		}
	}
}