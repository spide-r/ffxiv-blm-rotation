import {Debug, SkillName, ProcMode} from "./Common";
import {ResourceOverride} from "./Resources";

export class GameConfig {
    spellSpeed = 991;
    countdown = 0;
    randomSeed = "hello.";
    casterTax = 0.06;
    animationLock = 0.66;
    timeTillFirstManaTick = 1.2;
    procMode = ProcMode.RNG;
    extendedBuffTimes = false;
    hasteStacks = 0;
    valor = 0;
    etherCharges = 1;
    rngProcs = true;
    initialResourceOverrides: ResourceOverride[] = [];

    // DEBUG
    constructor(props?: {
        spellSpeed: number,
        countdown: number,
        randomSeed: string,
        casterTax: number,
        valor: number,
        hasteStacks: number,
        animationLock: number,
        etherCharges: number,
        timeTillFirstManaTick: number,
        procMode: ProcMode,
        extendedBuffTimes: boolean,
        initialResourceOverrides: any[]
    }) {
        if (props) {
            this.countdown = props.countdown;
            this.spellSpeed = props.spellSpeed;
            this.randomSeed = props.randomSeed;
            this.casterTax = props.casterTax;
            this.animationLock = props.animationLock;
            this.timeTillFirstManaTick = props.timeTillFirstManaTick;
            this.etherCharges = props.etherCharges;
            this.hasteStacks = props.hasteStacks;
            this.procMode = props.procMode;
            this.extendedBuffTimes = props.extendedBuffTimes;
            if (props.initialResourceOverrides) {
                this.initialResourceOverrides = props.initialResourceOverrides.map(obj=>{
                    return new ResourceOverride(obj);
                });
            }
        }
    }

    equals(other : GameConfig) {
        let sortFn = (a: ResourceOverride, b: ResourceOverride)=>{
            return a.props.type < b.props.type ? -1 : 1;
        };
        let thisSortedOverrides = this.initialResourceOverrides.sort(sortFn);
        let otherSortedOverrides = other.initialResourceOverrides.sort(sortFn);
        if (thisSortedOverrides.length === otherSortedOverrides.length) {
            for (let i = 0; i < thisSortedOverrides.length; i++) {
                if (!thisSortedOverrides[i].equals(otherSortedOverrides[i])) {
                    return false;
                }
            }
            return this.spellSpeed === other.spellSpeed &&
                this.countdown === other.countdown &&
                this.randomSeed === other.randomSeed &&
                this.casterTax === other.casterTax &&
                this.hasteStacks === other.hasteStacks &&
                this.valor === other.valor &&
                this.etherCharges === other.etherCharges &&
                this.animationLock === other.animationLock &&
                this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
                this.procMode === other.procMode &&
                this.extendedBuffTimes === other.extendedBuffTimes;
        } else {
            return false;
        }
    }

    adjustedDoTPotency(inPotency : number) { //991 is the sps you get in bozja on BLM - haste only affects GCD and not the actual dot tick (allagan studies)
        let dotStrength = (1000 + Math.floor((991 - 400) * 130 / 1900.0)) * 0.001;
        return inPotency * dotStrength;
    }

    adjustedCastTime(inCastTime : number) {
        let ceil = Math.ceil((400.0 - this.spellSpeed) * 130 / 1900.0);
        let pts = Math.floor(inCastTime * (1000.0 + ceil));

        return Math.floor(pts / 10) * 0.01;
    }

    getSkillAnimationLock(skillName : SkillName) : number {
        if (skillName === SkillName.Tincture) {
            return 1.16;
        } else if (skillName === SkillName.AetherialManipulation || skillName === SkillName.BetweenTheLines) {
            return 0.8; // from: https://nga.178.com/read.php?tid=21233094&rand=761
        } else {
            return this.animationLock;
        }
    }

    static getSlidecastWindow(castTime : number) {
        return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
    }

    serialized() {
        return {
            spellSpeed: this.spellSpeed,
            countdown: this.countdown,
            randomSeed: this.randomSeed,
            casterTax: this.casterTax,
            hasteStacks: this.hasteStacks,
            etherCharges: this.etherCharges,
            valor: this.valor,
            animationLock: this.animationLock,
            timeTillFirstManaTick: this.timeTillFirstManaTick,
            procMode: this.procMode,
            extendedBuffTimes: this.extendedBuffTimes,
            initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
        };
    }
}

