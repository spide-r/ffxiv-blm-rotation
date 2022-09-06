import {addLog, Color, LogCategory} from "../Controller/Common";
import {Debug, ResourceType} from "./Common"
import {GameState} from "./GameState";

export class Event {
	name: string;
	timeTillEvent: number;
	delay: number;
	effectFn: () => void;
	canceled: boolean;
	shouldLog: boolean;
	logColor: Color;

	// effectFn : () -> ()
	constructor(name: string, delay: number, effectFn: ()=>void, logColor=Color.Text, shouldLog=true)
	{
		this.name = name;
		this.timeTillEvent = delay;
		this.delay = delay;
		this.effectFn = effectFn;
		this.canceled = false;
		this.shouldLog = shouldLog;
		this.logColor = logColor;
	}
}

// can never be negative
export class Resource {
	type: ResourceType;
	maxValue: number;
	#currentValue: number;
	enabled: boolean;
	pendingChange?: Event;
	constructor(type: ResourceType, maxValue: number, initialValue: number) {
		this.type = type;
		this.maxValue = maxValue;
		this.#currentValue = initialValue;
		this.enabled = true;
	}
	overrideTimer(game: GameState, newTime: number) {
		if (this.pendingChange) {
			// hack: make a new event for this, so it's executed after all other events at this time are ticked
			game.addEvent(new Event(
				"override " + this.pendingChange.name + " timer: " + newTime,
				0,
				()=>{ if (this.pendingChange) this.pendingChange.timeTillEvent = newTime; }
			));
			this.pendingChange.timeTillEvent = newTime;
		} else {
			console.assert(false);
		}
	}
	removeTimer() {
		if (this.pendingChange) {
			this.pendingChange.canceled = true;
			this.pendingChange = undefined;
		}
	}
	available(amount: number) {
		return this.availableAmount() + Debug.epsilon >= amount;
	}
	availableAmount() {
		return this.enabled ? this.#currentValue : 0;
	}
	consume(amount: number) {
		if (!this.available(amount)) console.warn("invalid resource consumption: " + this.type);
		this.#currentValue = Math.max(this.#currentValue - amount, 0);
	}
	gain(amount: number) {
		this.#currentValue = Math.min(this.#currentValue + amount, this.maxValue);
	}
	overrideCurrentValue(amount: number) {
		this.#currentValue = amount;
	}
}

export class CoolDown extends Resource {
	readonly #cdPerStack: number;
	#recastTimeScale: number;
	constructor(type: ResourceType, cdPerStack: number, maxStacks: number, initialNumStacks: number) {
		super(type, maxStacks * cdPerStack, initialNumStacks * cdPerStack);
		this.#cdPerStack = cdPerStack;
		this.#recastTimeScale = 1; // effective for the next stack (i.e. 0.85 if captured LL)
	}
	currentStackCd() {
		return this.#cdPerStack * this.#recastTimeScale;

	}
	stacksAvailable() { return Math.floor((this.availableAmount() + Debug.epsilon) / this.#cdPerStack); }
	useStack(game: GameState) {
		this.consume(this.#cdPerStack);
		this.#reCaptureRecastTimeScale(game);
	}
	setRecastTimeScale(timeScale: number) { this.#recastTimeScale = timeScale; }
	#reCaptureRecastTimeScale(game: GameState) {
		this.#recastTimeScale = this.type === ResourceType.cd_GCD ? game.captureRecastTimeScale() : 1;
	}
	restore(game: GameState, deltaTime: number) {
		let stacksBefore = this.stacksAvailable();
		let unscaledTimeTillNextStack = (stacksBefore + 1) * this.#cdPerStack - this.availableAmount();
		let scaledTimeTillNextStack = unscaledTimeTillNextStack * this.#recastTimeScale;
		if (deltaTime >= scaledTimeTillNextStack) {// upon return, will have gained another stack
			// part before stack gain
			this.gain(unscaledTimeTillNextStack);
			// re-capture
			this.#reCaptureRecastTimeScale(game);
			// and part after stack gain
			this.gain((deltaTime - scaledTimeTillNextStack) / this.#recastTimeScale);
		} else {
			this.gain(deltaTime / this.#recastTimeScale);
		}
	}
	timeTillNextStackAvailable() {
		let currentStacks = this.stacksAvailable();
		if (currentStacks > 0) return 0;
		return (this.#cdPerStack - this.availableAmount()) * this.#recastTimeScale;
	}
}

export class CoolDownState extends Map<ResourceType, CoolDown> {
	game: GameState;
	constructor(game: GameState) {
		super();
		this.game = game;
	}
	get(rscType: ResourceType): CoolDown {
		let rsc = super.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false);
			return new CoolDown(ResourceType.Never, 0, 0, 0);
		}
	}
	tick(deltaTime: number) {
		for (const cd of this.values()) cd.restore(this.game, deltaTime);
	}
	stacksAvailable(rscType: ResourceType): number {
		return this.get(rscType).stacksAvailable();
	}
	setRecastTimeScale(cdName: ResourceType, timeScale: number) {
		let cd = this.get(cdName);
		cd.setRecastTimeScale(timeScale);
	}
	timeTillNextStackAvailable(cdName: ResourceType) {
		let cd = this.get(cdName);
		return cd.timeTillNextStackAvailable();
	}
}

export class ResourceState extends Map<ResourceType, Resource> {
	game: GameState;
	constructor(game: GameState) {
		super();
		this.game = game;
	}

	get(rscType: ResourceType): Resource {
		let rsc = super.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false);
			return new Resource(ResourceType.Never, 0, 0);
		}
	}

	timeTillReady(rscType: ResourceType): number {
		let rsc = this.get(rscType);
		if (rsc.pendingChange) {
			return rsc.pendingChange.timeTillEvent;
		}
		return 0;
	}

	// fnOnRsc : Resource -> ()
	addResourceEvent(
		rscType: ResourceType,
		name: string,
		delay: number,
		fnOnRsc: (rsc: Resource)=>void,
		logColor=Color.Text, shouldLog=true)
	{
		let rsc = this.get(rscType);
		 let evt = new Event(name, delay, ()=>{
			 rsc.pendingChange = undefined; // unregister self from resource
			 fnOnRsc(rsc); // before the scheduled event takes effect
		 }, logColor, shouldLog);
		 rsc.pendingChange = evt; // register to resource
		 this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType: ResourceType, delay: number) {
		this.get(rscType).consume(1);
		addLog(LogCategory.Event, "[resource locked] " + rscType, this.game.getDisplayTime(), Color.Grey);
		this.addResourceEvent(
			rscType, "[resource ready] " + rscType, delay, rsc=>{ rsc.gain(1); }, Color.Grey);
	}
}

export type ResourceInfo = {
	isCoolDown: false,
	defaultValue: number,
	maxValue: number,
	maxTimeout: number,
}
export type CoolDownInfo = {
	isCoolDown: true,
	maxStacks: number,
	cdPerStack: number
}
export type ResourceOrCoolDownInfo = ResourceInfo | CoolDownInfo;

export const resourceInfos = new Map<ResourceType, ResourceOrCoolDownInfo>();

// resources
resourceInfos.set(ResourceType.Mana, { isCoolDown: false, defaultValue: 10000, maxValue: 10000, maxTimeout: -1 });
resourceInfos.set(ResourceType.Polyglot, { isCoolDown: false, defaultValue: 0, maxValue: 2, maxTimeout: -1 });
resourceInfos.set(ResourceType.AstralFire, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });
resourceInfos.set(ResourceType.UmbralIce, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });
resourceInfos.set(ResourceType.UmbralHeart, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });

resourceInfos.set(ResourceType.LeyLines, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Sharpcast, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Enochian, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 15 }); // controls AF, UI, UH
resourceInfos.set(ResourceType.Paradox, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: -1 });
resourceInfos.set(ResourceType.Firestarter, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Thundercloud, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 40 });
resourceInfos.set(ResourceType.ThunderDoT, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 }); // buff display only
resourceInfos.set(ResourceType.Manaward, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 20 });
resourceInfos.set(ResourceType.Triplecast, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: 15 });
resourceInfos.set(ResourceType.Addle, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });
resourceInfos.set(ResourceType.Swiftcast, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });
resourceInfos.set(ResourceType.LucidDreamingTimerDisplay, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 21 }); // buff display only
resourceInfos.set(ResourceType.Surecast, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });
resourceInfos.set(ResourceType.Tincture, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Sprint, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });


// CDs
resourceInfos.set(ResourceType.cd_GCD, { isCoolDown: true, maxStacks: 1, cdPerStack: 2.5 });
resourceInfos.set(ResourceType.cd_Sharpcast, { isCoolDown: true, maxStacks: 2, cdPerStack: 30 });
resourceInfos.set(ResourceType.cd_LeyLines, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Transpose, { isCoolDown: true, maxStacks: 1, cdPerStack: 5 });
resourceInfos.set(ResourceType.cd_Manaward, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_BetweenTheLines, { isCoolDown: true, maxStacks: 1, cdPerStack: 3 });
resourceInfos.set(ResourceType.cd_AetherialManipulation, { isCoolDown: true, maxStacks: 1, cdPerStack: 10 });
resourceInfos.set(ResourceType.cd_Triplecast, { isCoolDown: true, maxStacks: 2, cdPerStack: 60 });
resourceInfos.set(ResourceType.cd_EtherKit, { isCoolDown: true, maxStacks: 1, cdPerStack: 30 });
resourceInfos.set(ResourceType.cd_Manafont, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Amplifier, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Addle, { isCoolDown: true, maxStacks: 1, cdPerStack: 90 });
resourceInfos.set(ResourceType.cd_Swiftcast, { isCoolDown: true, maxStacks: 1, cdPerStack: 60 });
resourceInfos.set(ResourceType.cd_LucidDreaming, { isCoolDown: true, maxStacks: 1, cdPerStack: 60 });
resourceInfos.set(ResourceType.cd_Surecast, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Tincture, { isCoolDown: true, maxStacks: 1, cdPerStack: 270 });
resourceInfos.set(ResourceType.cd_Sprint, { isCoolDown: true, maxStacks: 1, cdPerStack: 60 });

// Bozja
resourceInfos.set(ResourceType.cd_Elixir, { isCoolDown: true, maxStacks: 1, cdPerStack: 90 });
resourceInfos.set(ResourceType.cd_FoM, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Reg_Skirmisher,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Skirmisher,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Elder,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Watcher,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Gambler,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Excellence,{ isCoolDown: true, maxStacks: 1, cdPerStack: 300 });
resourceInfos.set(ResourceType.cd_Dervish,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Ten_Bravery,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_uptime_Bravery,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_five_Bravery,{ isCoolDown: true, maxStacks: 1, cdPerStack: 1 });
resourceInfos.set(ResourceType.cd_Chainspell,{ isCoolDown: true, maxStacks: 1, cdPerStack: 90 });
resourceInfos.set(ResourceType.cd_FoS,{ isCoolDown: true, maxStacks: 1, cdPerStack: 300 });
resourceInfos.set(ResourceType.cd_HonoredSac,{ isCoolDown: true, maxStacks: 1, cdPerStack: 90 });
resourceInfos.set(ResourceType.cd_NobleEnds,{ isCoolDown: true, maxStacks: 1, cdPerStack: 90 });

resourceInfos.set(ResourceType.FlareStarDoT, {isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 60}) // buff display
resourceInfos.set(ResourceType.EtherKit, { isCoolDown: false, defaultValue: 0, maxValue: 9999, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Reg_Skirmisher, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Skirmisher, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Watcher, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Gambler, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Elder, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 * 60});
resourceInfos.set(ResourceType.Excellence, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 300});
resourceInfos.set(ResourceType.Dervish, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 1});
resourceInfos.set(ResourceType.ten_Bravery, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 1});
resourceInfos.set(ResourceType.uptime_Bravery, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 1});
resourceInfos.set(ResourceType.five_Bravery, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 1});
resourceInfos.set(ResourceType.FoMTimerDisplay, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 }); // buff display only
resourceInfos.set(ResourceType.NobleEnds, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 15 });
resourceInfos.set(ResourceType.HonoredSac, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 15 });




type ResourceOverrideProps = {
	type: ResourceType,
	timeTillFullOrDrop: number, // CDs (full), buff/procs (drop)
	stacks: number, // Triplecast, MP, AF, UI, UH, Paradox, Polyglot
	enabled: boolean, // LL
};

export class ResourceOverride {
	props: ResourceOverrideProps;
	constructor(props: ResourceOverrideProps) {
		this.props = props;
	}

	equals(other: ResourceOverride) {
		let a = this.props;
		let b = other.props;
		return a.type === b.type &&
			a.timeTillFullOrDrop === b.timeTillFullOrDrop &&
			a.stacks === b.stacks &&
			a.enabled === b.enabled;
	}

	// CDs: time till full
	// LL: enabled, time till full
	// Triplecast: stacks, time till drop
	// other buffs & enochian: time till drop
	// MP, AF, UI, UH, Paradox, Polyglot: amount (stacks)
	applyTo(game: GameState) {

		let info = resourceInfos.get(this.props.type);
		if (!info) {
			console.assert(false);
			return;
		}

		// CD
		if (info.isCoolDown) {
			let cd = game.cooldowns.get(this.props.type);
			cd.overrideCurrentValue(cd.maxValue - this.props.timeTillFullOrDrop);
		}

		// resource
		else {
			let rsc = game.resources.get(this.props.type);

			let overrideRscTimer = (newTimer: number) => {
				rsc.removeTimer();
				game.resources.addResourceEvent(rsc.type, "drop " + rsc.type, newTimer, (r: Resource) => {
					if (rsc.type === ResourceType.Enochian) { // since enochian should also take away AF/UI/UH stacks
						game.loseEnochian();
					} else {
						r.consume(r.availableAmount());
					}
				});
			};

			// Ley Lines (timer + enabled)
			if (rsc.type === ResourceType.LeyLines)
			{
				rsc.consume(rsc.availableAmount());
				rsc.gain(1);
				overrideRscTimer(this.props.timeTillFullOrDrop);
				rsc.enabled = this.props.enabled;
			}

			// everything else (timer and/or stacks)
			else {

				// stacks
				let stacks = this.props.stacks;
				rsc.consume(rsc.availableAmount());
				rsc.gain(stacks);

				// timer
				let timer = this.props.timeTillFullOrDrop;
				if (stacks > 0 && info.maxTimeout >= 0) { // may expire
					overrideRscTimer(timer);
				}
			}
		}
	}

	serialized() {
		return this.props;
	}
}