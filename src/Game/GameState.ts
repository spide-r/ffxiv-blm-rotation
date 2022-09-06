import {Aspect, Debug, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {GameConfig} from "./GameConfig"
import {StatsModifier} from "./StatsModifier";
import {SkillApplicationCallbackInfo, SkillCaptureCallbackInfo, SkillsList} from "./Skills"
import {CoolDown, CoolDownState, Event, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {addLog, Color, LogCategory} from "../Controller/Common";
import {ActionNode} from "../Controller/Record";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;

// GameState := resources + events queue
export class GameState {
	config: GameConfig
	rng: RNG;
	#nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	actorTickOffset: number;
	time: number;
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList;

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = new SeedRandom(config.randomSeed);
		this.#nonProcRng = new SeedRandom(config.randomSeed + "_nonProcs");
		this.actorTickOffset = this.#nonProcRng() * 3.0;

		// TIME
		this.time = 0;

		// RESOURCES (checked when using skills)
		this.resources = new ResourceState(this);
		this.resources.set(ResourceType.Mana, new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(ResourceType.Polyglot, new Resource(ResourceType.Polyglot, 2, 0));
		this.resources.set(ResourceType.AstralFire, new Resource(ResourceType.AstralFire, 3, 0));
		this.resources.set(ResourceType.UmbralIce, new Resource(ResourceType.UmbralIce, 3, 0));
		this.resources.set(ResourceType.UmbralHeart, new Resource(ResourceType.UmbralHeart, 3, 0));

		this.resources.set(ResourceType.LeyLines, new Resource(ResourceType.LeyLines, 1, 0));
		this.resources.set(ResourceType.Sharpcast, new Resource(ResourceType.Sharpcast, 1, 0));
		this.resources.set(ResourceType.Enochian, new Resource(ResourceType.Enochian, 1, 0));
		this.resources.set(ResourceType.Paradox, new Resource(ResourceType.Paradox, 0, 0));
		this.resources.set(ResourceType.Firestarter, new Resource(ResourceType.Firestarter, 1, 0));
		this.resources.set(ResourceType.Thundercloud, new Resource(ResourceType.Thundercloud, 1, 0));
		this.resources.set(ResourceType.ThunderDoTTick, new Resource(ResourceType.ThunderDoTTick, 1, 0));
		this.resources.set(ResourceType.ThunderDoT, new Resource(ResourceType.ThunderDoT, 1, 0));
		this.resources.set(ResourceType.Manaward, new Resource(ResourceType.Manaward, 1, 0));
		this.resources.set(ResourceType.Triplecast, new Resource(ResourceType.Triplecast, 3, 0));
		this.resources.set(ResourceType.Addle, new Resource(ResourceType.Addle, 1, 0));
		this.resources.set(ResourceType.Swiftcast, new Resource(ResourceType.Swiftcast, 1, 0));
		this.resources.set(ResourceType.LucidDreamingTimerDisplay, new Resource(ResourceType.LucidDreamingTimerDisplay, 1, 0));
		this.resources.set(ResourceType.LucidTick, new Resource(ResourceType.LucidDreamingTimerDisplay, 1, 0));
		this.resources.set(ResourceType.Surecast, new Resource(ResourceType.Surecast, 1, 0));
		this.resources.set(ResourceType.Tincture, new Resource(ResourceType.Tincture, 1, 0));
		this.resources.set(ResourceType.Sprint, new Resource(ResourceType.Sprint, 1, 0));




		// Bozja
		this.resources.set(ResourceType.FlareStarDoTTick, new Resource(ResourceType.FlareStarDoTTick, 1, 0))
		this.resources.set(ResourceType.FlareStarDoT, new Resource(ResourceType.FlareStarDoT, 1, 0))
		this.resources.set(ResourceType.EtherKit, new Resource(ResourceType.EtherKit, 9999, 0));
		this.resources.set(ResourceType.Skirmisher, new Resource(ResourceType.Skirmisher, 1,0));
		this.resources.set(ResourceType.Reg_Skirmisher, new Resource(ResourceType.Reg_Skirmisher, 1,0));
		this.resources.set(ResourceType.Watcher, new Resource(ResourceType.Watcher, 1,0));
		this.resources.set(ResourceType.Elder, new Resource(ResourceType.Elder, 1,0));
		this.resources.set(ResourceType.Gambler, new Resource(ResourceType.Gambler, 1,0));
		this.resources.set(ResourceType.Excellence, new Resource(ResourceType.Excellence, 1,0));
		this.resources.set(ResourceType.Dervish, new Resource(ResourceType.Excellence, 1,0));
		this.resources.set(ResourceType.five_Bravery, new Resource(ResourceType.five_Bravery, 1,0));
		this.resources.set(ResourceType.ten_Bravery, new Resource(ResourceType.ten_Bravery, 1,0));
		this.resources.set(ResourceType.uptime_Bravery, new Resource(ResourceType.uptime_Bravery, 1,0));
		this.resources.set(ResourceType.FoMTick, new Resource(ResourceType.FoMTimerDisplay, 1, 0));
		this.resources.set(ResourceType.Chainspell, new Resource(ResourceType.Chainspell, 1, 0));
		this.resources.set(ResourceType.MagicBurst, new Resource(ResourceType.MagicBurst, 1, 0));
		this.resources.set(ResourceType.HonoredSac, new Resource(ResourceType.HonoredSac, 1, 0));
		this.resources.set(ResourceType.NobleEnds, new Resource(ResourceType.NobleEnds, 1, 0));


		this.resources.set(ResourceType.FoMTimerDisplay, new Resource(ResourceType.FoMTimerDisplay, 1, 0));



		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(ResourceType.NotCasterTaxed, new Resource(ResourceType.NotCasterTaxed, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(ResourceType.cd_GCD, new CoolDown(ResourceType.cd_GCD, config.adjustedCastTime(2.5), 1, 1));
		this.cooldowns.set(ResourceType.cd_Sharpcast, new CoolDown(ResourceType.cd_Sharpcast, 30, 1, 1));
		this.cooldowns.set(ResourceType.cd_LeyLines, new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Transpose, new CoolDown(ResourceType.cd_Transpose, 5, 1, 1));
		this.cooldowns.set(ResourceType.cd_Manaward, new CoolDown(ResourceType.cd_Manaward, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_BetweenTheLines, new CoolDown(ResourceType.cd_BetweenTheLines, 3, 1, 1));
		this.cooldowns.set(ResourceType.cd_AetherialManipulation, new CoolDown(ResourceType.cd_AetherialManipulation, 10, 1, 1));
		this.cooldowns.set(ResourceType.cd_Triplecast, new CoolDown(ResourceType.cd_Triplecast, 60, 2, 2));
		this.cooldowns.set(ResourceType.cd_EtherKit, new CoolDown(ResourceType.cd_EtherKit, 30, 1, 1));
		this.cooldowns.set(ResourceType.cd_Manafont, new CoolDown(ResourceType.cd_Manafont, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Amplifier, new CoolDown(ResourceType.cd_Amplifier, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Addle, new CoolDown(ResourceType.cd_Addle, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_Swiftcast, new CoolDown(ResourceType.cd_Swiftcast, 60, 1, 1));
		this.cooldowns.set(ResourceType.cd_LucidDreaming, new CoolDown(ResourceType.cd_LucidDreaming, 60, 1, 1));
		this.cooldowns.set(ResourceType.cd_Surecast, new CoolDown(ResourceType.cd_Surecast, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Tincture, new CoolDown(ResourceType.cd_Tincture, 270, 1, 1));
		this.cooldowns.set(ResourceType.cd_Sprint, new CoolDown(ResourceType.cd_Sprint, 60, 1, 1));

		this.cooldowns.set(ResourceType.cd_Elixir, new CoolDown(ResourceType.cd_Elixir, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_Elder, new CoolDown(ResourceType.cd_Elder, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Gambler, new CoolDown(ResourceType.cd_Gambler, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Watcher, new CoolDown(ResourceType.cd_Watcher, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Skirmisher, new CoolDown(ResourceType.cd_Skirmisher, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Reg_Skirmisher, new CoolDown(ResourceType.cd_Reg_Skirmisher, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Excellence, new CoolDown(ResourceType.cd_Excellence, 300, 1, 1));
		this.cooldowns.set(ResourceType.cd_Dervish, new CoolDown(ResourceType.cd_Dervish, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_five_Bravery, new CoolDown(ResourceType.cd_five_Bravery, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_uptime_Bravery, new CoolDown(ResourceType.cd_uptime_Bravery, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Ten_Bravery, new CoolDown(ResourceType.cd_Ten_Bravery, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_FoM, new CoolDown(ResourceType.cd_FoM, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Chainspell, new CoolDown(ResourceType.cd_Chainspell, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_FoS, new CoolDown(ResourceType.cd_FoS, 300, 1, 1));
		this.cooldowns.set(ResourceType.cd_HonoredSac, new CoolDown(ResourceType.cd_HonoredSac, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_NobleEnds, new CoolDown(ResourceType.cd_NobleEnds, 90, 1, 1));



		// EVENTS QUEUE (events decide future changes to resources)
		// which might include:
		// - damage calc (enqueues damage application)
		// - damage application
		// - dot application / refresh (put dot up, refresh timer by removing and re-enqueueing "thunder fall off" event)
		// - dot fall off (by dot application)
		// - modifiers up (which potentially enqueues modifier down)
		// - modifiers down (by modifiers up)
		this.eventsQueue = [];

		// SKILLS (instantiated once, read-only later)
		this.skillsList = new SkillsList(this);

		this.#init();
	}

	#init() {
		let game = this;
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			let recurringManaRegen = ()=>{
				// mana regen
				let mana = this.resources.get(ResourceType.Mana);
				let gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				let currentAmount = mana.availableAmount();
				controller.reportManaTick(game.time, "MP +" + gainAmount + " (MP="+currentAmount+")");
				addLog(LogCategory.Event, "mana tick +" + gainAmount, this.getDisplayTime(), Color.ManaTick);
				// queue the next tick
				this.resources.addResourceEvent(ResourceType.Mana, "mana tick", 3, rsc=>{
					recurringManaRegen();
				}, Color.ManaTick, false);
			};
			this.resources.addResourceEvent(ResourceType.Mana, "initial mana tick", this.config.timeTillFirstManaTick, recurringManaRegen, Color.ManaTick, false);
		}

		// also polyglot
		let recurringPolyglotGain = (rsc: Resource)=>{
			if (this.hasEnochian()) rsc.gain(1);
			this.resources.addResourceEvent(ResourceType.Polyglot, "gain polyglot if currently has enochian", 30, recurringPolyglotGain);
		};
		recurringPolyglotGain(this.resources.get(ResourceType.Polyglot));
	}

	// advance game state by this much time
	tick(deltaTime: number, prematureStopCondition=()=>{ return false; }) {
		//======== events ========
		let cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime && this.eventsQueue.length > 0 && !prematureStopCondition())
		{
			// make sure events are in proper order
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);
			cumulativeDeltaTime = Math.min(cumulativeDeltaTime + timeToTick, deltaTime);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);
			if (Debug.consoleLogEvents) console.log("====== tick " + timeToTick + " now at " + this.time);

			// make a deep copy of events to advance for this round...
			const eventsToExecuteOld = [];
			for (let i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			let executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				e.timeTillEvent -= timeToTick;
				if (Debug.consoleLogEvents) console.log(e.name + " in " + e.timeTillEvent);
				if (e.timeTillEvent <= Debug.epsilon)
				{
					if (!e.canceled)
					{
						if (e.shouldLog) addLog(LogCategory.Event, e.name, this.getDisplayTime(), e.logColor);
						e.effectFn();
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);
		}
		if (Debug.consoleLogEvents) {
			console.log(this.toString());
			console.log(this.resources);
			console.log(this.cooldowns);
		}
		return cumulativeDeltaTime;
	}

	addEvent(evt: Event) {
		this.eventsQueue.push(evt);
	}

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).availableAmount(); }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).availableAmount(); }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).availableAmount(); }
	getMP() { return this.resources.get(ResourceType.Mana).availableAmount(); }

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

	switchToAForUI(rscType: ResourceType, numStacks: number) {
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		if (rscType===ResourceType.AstralFire)
		{
			af.gain(numStacks);
			if (ui.available(3) && uh.available(3)) {
				paradox.gain(1);
				addLog(LogCategory.Event, "Paradox! (UI -> AF)", this.getDisplayTime());
			}
			ui.consume(ui.availableAmount());
		}
		else if (rscType===ResourceType.UmbralIce)
		{
			ui.gain(numStacks);
			if (af.available(3)) {
				paradox.gain(1);
				addLog(LogCategory.Event, "Paradox! (AF -> UI)", this.getDisplayTime());
			}
			af.consume(af.availableAmount());
		}
	}

	// number -> number
	captureDamage(aspect: Aspect, basePotency: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let potency = basePotency * mod.damageBase;

		if (aspect === Aspect.Fire)
		{
			potency *= mod.damageFire;
		}
		else if (aspect === Aspect.Ice)
		{
			potency *= mod.damageIce;
		}

		potency *= this.getEssenceModifier();
		potency *= this.getBannerModifier();
		potency *= this.getExternalBuffModifier();
		potency *= this.getValorModifier();

		return potency;
	}

	getValorModifier(){ //+3% per stack
		let valor = this.config.valor;
		let mod = .03 * valor;
		return mod;
	}

	getEssenceModifier(){
		let rsc = this.resources;
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

	getBannerModifier(){ //honored sac & noble ends
		let rsc = this.resources;
		let mod = 1;
		if(rsc.get(ResourceType.NobleEnds).available(1)){
			mod *= 1.50
		}
		if(rsc.get(ResourceType.HonoredSac).available(1)){
			mod *= 1.55
		}
		return mod;
	}

	getExternalBuffModifier(){ //dervish, bravery, excellence, magic burst, FoM, (high-wire)
		let rsc = this.resources;
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

		if(rsc.get(ResourceType.FoMTick).available(1)){
			mod *= 1.7; // WHOA MOMMA THATS A BIG BOY BUFF
		}

		return mod;
	}

	captureManaCostAndUHConsumption(aspect: Aspect, baseManaCost: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let manaCost;
		let uhConsumption = 0;

		if (aspect === Aspect.Fire) {
			manaCost = baseManaCost * mod.manaCostFire;
			uhConsumption = mod.uhConsumption;
		}
		else if (aspect === Aspect.Ice) {
			manaCost = baseManaCost * mod.manaCostIce;
		}
		else {
			manaCost = baseManaCost;
		}

		if(this.resources.get(ResourceType.MagicBurst).available(1)){
			manaCost *= 1.3; //Magic Burst MP consumption is 30% more
		}
		return [manaCost, uhConsumption];
	}

	captureManaRegenAmount() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	captureSpellCastTime(aspect: Aspect, baseCastTime: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = baseCastTime * mod.castTimeBase;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return castTime;
	}

	captureRecastTimeScale() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.spellRecastTimeScale;
	}

	dealDamage(potency: number, source="unknown") {
		controller.reportDamage({
			potency: potency,
			time: this.time,
			source: source
		});
	}

	reportPotency(node: ActionNode, potency: number, source: string) {
		node.tmp_capturedPotency = (node.tmp_capturedPotency ?? 0) + potency;
		controller.reportPotencyUpdate();
	}

	requestToggleBuff(buffName: ResourceType) {
		let rsc = this.resources.get(buffName);
		// only ley lines can be enabled / disabled. Everything else will just be canceled
		if (buffName === ResourceType.LeyLines) {
			rsc.enabled = !rsc.enabled;
		} else {
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
		}
	}

	castSpell(
		skillName: SkillName,
		onCapture: (cap: SkillCaptureCallbackInfo)=>void,
		onApplication: (app: SkillApplicationCallbackInfo)=>void,
		node: ActionNode)
	{
		let skill = this.skillsList.get(skillName);
		let skillInfo = skill.info;
		console.assert(skillInfo.isSpell);
		let cd = this.cooldowns.get(skillInfo.cdName);
		let [capturedManaCost, uhConsumption] = this.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);
		let capturedCastTime = this.captureSpellCastTime(skillInfo.aspect, this.config.adjustedCastTime(skillInfo.baseCastTime));
		//let recastTimeScale = this.captureRecastTimeScale();

		let skillTime = this.getDisplayTime();

		let takeEffect = function(game: GameState) {
			let resourcesStillAvailable = skill.available();
			let sourceName = skillInfo.name + "@"+skillTime.toFixed(2)
			if (resourcesStillAvailable) {
				// re-capture them here, since game state might've changed (say, AF/UI fell off)
				[capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);

				// actually deduct resources (except some special ones like Paradox and Flare that deduct resources in effect fn)
				if (skillName !== SkillName.Flare) {
					if (!(skillName===SkillName.Paradox && game.getIceStacks()>0)){ //oops i fucked something here maybe
						game.resources.get(ResourceType.Mana).consume(capturedManaCost);
					}
					if (uhConsumption > 0){
						game.resources.get(ResourceType.UmbralHeart).consume(uhConsumption);
					}

					if(game.resources.get(ResourceType.EtherKit).available(1)){ //ether kit available
						console.log("Ether kit available")
						if(game.resources.get(ResourceType.Mana).availableAmount() < 2000){
							console.log("mana now below 2000 - adding mp")
							//burn etherkit - add 5000 MP
							game.resources.get(ResourceType.EtherKit).consume(1);
							if(game.resources.get(ResourceType.EtherKit).availableAmount() === 0){
								game.resources.get(ResourceType.EtherKit).removeTimer();
							}
							game.resources.get(ResourceType.Mana).gain(5000);

						}

					}

				}



				if (capturedManaCost > 0)
					addLog(LogCategory.Event, skillName + " cost " + capturedManaCost + "MP", game.getDisplayTime());

				let capturedPotency = game.captureDamage(skillInfo.aspect, skillInfo.basePotency);
				game.reportPotency(node, capturedPotency, sourceName);
				let captureInfo: SkillCaptureCallbackInfo = {
					capturedManaCost: capturedManaCost
					//...
				};
				onCapture(captureInfo);

				// effect application
				game.addEvent(new Event(
					skillInfo.name + " applied",
					skillInfo.skillApplicationDelay,
					()=>{
						game.dealDamage(capturedPotency, sourceName);
						let applicationInfo: SkillApplicationCallbackInfo = {
							//...
						};
						onApplication(applicationInfo);
					},
					Color.Text));
				return true;
			} else {
				//console.log(skillName + " failed; rewinding game...");
				addLog(
					LogCategory.Event,
					skillName + " cast failed! Resources no longer available.",
					game.getDisplayTime(),
					Color.Error);
				// unlock movement and casting
				//game.resources.get(ResourceType.NotCasterTaxed).gain(1);
				//game.resources.get(ResourceType.NotCasterTaxed).removeTimer();
				return false;
			}
		}

		let instantCast = function(game: GameState, rsc?: Resource) {
			let instantCastReason = rsc ? rsc.type : "(unknown, paradox?)";
			addLog(LogCategory.Event, "a cast is made instant via " + instantCastReason, game.getDisplayTime(), Color.Success);
			if (rsc) rsc.consume(1);
			takeEffect(game);

			// recast
			cd.useStack(game);
			//cd.setRecastTimeScale(recastTimeScale)

			// animation lock
			game.resources.takeResourceLock(ResourceType.NotAnimationLocked, game.config.getSkillAnimationLock(skillName));
		}

		// Paradox made instant via UI
		if (skillName === SkillName.Paradox && this.getIceStacks() > 0) {
			instantCast(this, undefined);
			return;
		}

		// Chainspell
		let chain = this.resources.get(ResourceType.Chainspell);
		if(chain.available(1)){
			instantCast(this, undefined);
			return;
		}

		// Swiftcast
		let swift = this.resources.get(ResourceType.Swiftcast);
		if (swift.available(1)) {
			swift.removeTimer();
			instantCast(this, swift);
			return;
		}

		// Triplecast charge
		let triple = this.resources.get(ResourceType.Triplecast);
		if (triple.available(1)) {
			instantCast(this, triple);
			if (!triple.available(1)) {
				triple.removeTimer();
				addLog(LogCategory.Event, "all triple charges used", this.getDisplayTime());
			}
			return;
		}



		// there are no triplecast charges. cast and apply effect

		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));

		// (basically done casting) deduct MP, calc damage, queue damage
		this.addEvent(new Event(skillInfo.name + " captured", capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime), ()=>{
			let success = takeEffect(this);
			if (!success) {
				controller.reportInterruption({
					failNode: node
				});
			}
		}));


		/*
		this probably wont work since haste gear will affect the gcd
		set recast timescale to 2.083333 if using flare star.
		sps is 991 which is a base gcd of 2.4
		2.4 * X = 5.0
		X = 5.0 / 2.4
		X = 2.083333...
		this will set the recast to 5s which should affect the gcd
		 */
		// recast
		cd.useStack(this);
		//cd.setRecastTimeScale(recastTimeScale)

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotCasterTaxed, capturedCastTime + this.config.casterTax);
	}

	useInstantSkill(props: {
		skillName: SkillName,
		effectFn: () => void,
		dealDamage: boolean,
		node: ActionNode
	}) {
		console.assert(props.node);
		let skillInfo = this.skillsList.get(props.skillName).info;
		let skillTime = this.getDisplayTime();
		let cd = this.cooldowns.get(skillInfo.cdName);
		let sourceName = skillInfo.name+"@"+skillTime.toFixed(2);

		let capturedDamage = 0;
		if (props.dealDamage) {
			capturedDamage = this.captureDamage(skillInfo.aspect, skillInfo.basePotency);
			this.reportPotency(props.node, capturedDamage, sourceName);
		}
		//let recastTimeScale = this.captureRecastTimeScale();

		let skillEvent = new Event(
			skillInfo.name + " applied",
			skillInfo.skillApplicationDelay,
			()=>{
				if (props.dealDamage) this.dealDamage(capturedDamage, sourceName);
				props.effectFn();
			}
			, Color.Text);
		this.addEvent(skillEvent);

		// recast
		cd.useStack(this);
		//if (skillInfo.isSpell) cd.setRecastTimeScale(recastTimeScale);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.getSkillAnimationLock(props.skillName));
	}

	hasEnochian()
	{
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		let enochian = this.resources.get(ResourceType.Enochian);
		return enochian.available(1);
	}

	// falls off after 15s unless refreshed by AF / UI
	startOrRefreshEnochian() {
		let enochian = this.resources.get(ResourceType.Enochian);

		if (enochian.available(1)) {
			// refresh
			enochian.overrideTimer(this, 15);
			addLog(LogCategory.Event, "refresh enochian timer", this.getDisplayTime());

		} else {
			// fresh gain
			enochian.gain(1);

			// add the event for losing it
			this.resources.addResourceEvent(ResourceType.Enochian, "lose enochian, clear all AF, UI, UH, stop poly timer", 15, rsc=>{
				this.loseEnochian();
			});

			addLog(LogCategory.Event, "override poly timer to 30", this.getDisplayTime(), Color.Text);
			// reset polyglot countdown to 30s
			this.resources.get(ResourceType.Polyglot).overrideTimer(this, 30);
		}
	}

	loseEnochian() {
		this.resources.get(ResourceType.Enochian).consume(1);
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		af.consume(af.availableAmount());
		ui.consume(ui.availableAmount());
		uh.consume(uh.availableAmount());
	}

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.info.cdName;
		let tillNextCDStack = this.cooldowns.timeTillNextStackAvailable(cdName);
		return Math.max(this.timeTillAnySkillAvailable(), tillNextCDStack);
	}

	timeTillAnySkillAvailable() {
		let tillNotAnimationLocked = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNotCasterTaxed = this.resources.timeTillReady(ResourceType.NotCasterTaxed);
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	getSkillAvailabilityStatus(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.info.name);
		let [capturedManaCost, uhConsumption] = skill.info.isSpell ? this.captureManaCostAndUHConsumption(skill.info.aspect, skill.info.baseManaCost) : [0,0];
		let capturedCastTime = this.captureSpellCastTime(skill.info.aspect, this.config.adjustedCastTime(skill.info.baseCastTime));
		let instantCastAvailable = this.resources.get(ResourceType.Triplecast).available(1)
			|| this.resources.get(ResourceType.Swiftcast).available(1)
			|| (skillName===SkillName.Paradox && this.getIceStacks()>0)
			|| (skillName===SkillName.Thunder3 && this.resources.get(ResourceType.Thundercloud).available(1))
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)));
		let currentMana = this.resources.get(ResourceType.Mana).availableAmount();
		let notBlocked = timeTillAvailable <= Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana
			|| (skillName===SkillName.Paradox && this.getIceStacks()>0)
			|| (skillName===SkillName.Thunder3 && this.resources.get(ResourceType.Thundercloud).available(1))
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)));
		let reqsMet = skill.available();
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;

		let cd = this.cooldowns.get(skill.info.cdName);
		let cdReadyCountdown = this.cooldowns.timeTillNextStackAvailable(skill.info.cdName);
		let cdRecastTime = cd.currentStackCd();//cd.#cdPerStack * (skill.info.isSpell ? recastTimeScale : 1);

		// conditions that make the skills show proc
		let highlight = false;

		if (skillName === SkillName.Paradox) {// paradox
			highlight = true;
		} else if (skillName === SkillName.Fire3) {// F3P
			if (this.resources.get(ResourceType.Firestarter).available(1)) highlight = true;
		} else if (skillName === SkillName.Thunder3) {// T3P
			if (this.resources.get(ResourceType.Thundercloud).available(1)) highlight = true;
		} else if (skillName === SkillName.Foul || skillName === SkillName.Xenoglossy) {// polyglot
			if (this.resources.get(ResourceType.Polyglot).available(1)) highlight = true;
		}

		return {
			status: status,
			description: "",
			stacksAvailable: cd.stacksAvailable(),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: cdRecastTime,
			cdReadyCountdown: cdReadyCountdown,
			timeTillAvailable: timeTillAvailable,
			capturedManaCost: capturedManaCost,
			highlight: highlight
		};
	}

	useSkill(skillName: SkillName, node: ActionNode) {
		let skill = this.skillsList.get(skillName);
		skill.use(this, node);
	}

	toString() {
		let s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).availableAmount() + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).availableAmount() + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).availableAmount() + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).availableAmount() + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).availableAmount() + "\n";
		s += "TC:\t" + this.resources.get(ResourceType.Thundercloud).availableAmount() + "\n";
		s += "LL:\t" + this.resources.get(ResourceType.LeyLines).availableAmount() + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).availableAmount() + "\n";
		s += "GCD:\t" + this.cooldowns.get(ResourceType.cd_GCD).availableAmount().toFixed(3) + "\n";
		s += "LLCD:\t" + this.cooldowns.get(ResourceType.cd_LeyLines).availableAmount().toFixed(3) + "\n";
		return s;
	}
}