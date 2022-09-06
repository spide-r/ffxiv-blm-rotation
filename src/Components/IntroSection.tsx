import React, {CSSProperties} from 'react';
import {Expandable, Help, ButtonIndicator} from "./Common";
import {DebugOptions} from "./DebugOptions";
import changelog from "../changelog.json"

function Changelog() {
	return <div className={"paragraph"}><Expandable title={"Changelog"} defaultShow={false} content={
		<div>
			{
				changelog.map(entry => {
					let changes: JSX.Element[] = [];
					for (let i = 0; i < entry.changes.length; i++) {
						changes.push(<div key={i}>{entry.changes[i]}</div>);
					}
					return <div className={"paragraph"} key={entry.date}>
						{entry.date}<br/>
						{changes}
					</div>
				})
			}
		</div>
	}/></div>
}

export function IntroSection(props: {}) {
	let smallGap: CSSProperties = { marginBottom: 5 };
	return <div>

		<Expandable
			defaultShow={true}
			title={"About this tool"}
			content={<div>
				<div className="paragraph">This is a FFXIV black mage simulator & rotation planner built for Save the Queen areas.</div>
				<div className="paragraph">
					This tool is maintained by <b>A'zhek Silvaire @ Zalera</b>. Adapted from miyehn's fantastic simulator.
				</div>
				<div className="paragraph">
					Please contact Spider#5879 if you have any questions, comments, or concerns.
				</div>
				<div className="paragraph">Some links:</div>
				<ul>
					<li><a href={"https://github.com/miyehn/ffxiv-blm-rotation"}> Github repository this was forked from</a></li>
					<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job
						guide</a></li>
					<li><a href={"https://discord.gg/cem"}>Crystal Exploratory Missions Discord</a></li>
				</ul>
				<div className="paragraph"><Expandable title={"Bozja Implementation notes"} defaultShow={false} content={
					<div>
						<div className="paragraph">
							Haste and Rays of Valor can be configured in the "Edit" sidebar.
						</div>
						<div className="paragraph">
							"Ether Kit Charges" is a hacky implementation of both proc luck and Cure 2 Batteries. By default Ether kits will only proc once and then fade.
							If you feel lucky, you can add additional "charges" which translate to procs where the buff doesn't fall off.
							If you're calculating with a Cure 2 battery in mind, set the amount to something like 9999.
						</div>

						<div className="paragraph">
							I could not find raw numbers on lost action / essence animation lock. If you have accurate numbers, please contact me.
						</div>
					</div>
				}/></div>
				<div className="paragraph"><Expandable title={"Base Implementation notes"} defaultShow={false} content={
					<div>
						<div className="paragraph">
							Galahad found that slidecast window size is linear with respect to cast time. I made a <a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>script</a>, parsed
							a few logs and confirmed this. Albeit the slope is tiny (~0.02) so I'm just using 0.5s here
							for simplicity.
						</div>
						<div className="paragraph">
							Astral fire / umbral ice refresh happens at slidecast timing (0.5s before cast finishes)
						</div>
						<div className="paragraph">
							Skill application delays are fairly accurate for spells (got them from logs), but all abilities
							except lucid dreaming just use a 0.1s estimate (see the last function
							argument <a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>here</a>).
							Please contact me if you know how to measure this missing data.
							These delay times affect when buffs are applied as well as where the red damage marks appear
							on the timeline.
						</div>
						<div className="paragraph">
							Lucid dreaming ticks happen on actor ticks, which have a random offset relative to MP tick.
							The earliest first tick time is 0.3s after you press the skill button. It ticks 7 times.
						</div>
					</div>
				}/></div>
				<Changelog/>
				<Expandable
					defaultShow={false}
					title={"Debug"}
					content={<DebugOptions/>}
				/>
			</div>
			}
		/>
		<Expandable
			defaultShow={false}
			title={"instructions"}
			titleNode={<span>{"Instructions "}
				<Help topic={"expandable"} content={"click me to expand or collapse"}/></span>}
			content={<div>
				<div className="paragraph">
					<b>General usage</b>
				</div>
				<ul>
					<li style={smallGap}>Set your stats in <b>Config/Edit</b> on the right, then <ButtonIndicator text={"apply and reset"}/></li>
					<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
					<li style={smallGap}>Press <ButtonIndicator text={"u"}/> to delete the last added action (effective when not running in real-time).</li>
					<li style={smallGap}>Click on a buff applied to self to remove it. Unless it's ley lines, in which case it can be re-enabled.</li>
				</ul>
				<div className="paragraph">
					<b>Timeline</b>
				</div>
				<ul>
					<li style={smallGap}>Click to select a skill on the timeline. Shift click to select a sequence of skills</li>
					<li style={smallGap}><ButtonIndicator text={"backspace"}/> to delete the selected skill and everything after it</li>
					<li style={smallGap}>Click on the timeline's ruler-like header to view historical game states.
						While doing so, the main control region will have an <b style={{color: "darkorange"}}>orange</b> border
						and you will not be able to use skills. Click on somewhere else on the timeline to cancel.
					</li>
				</ul>
				<div className="paragraph">
					Most edits are automatically saved in your browser cache, so it's generally okay to refresh the page
					and
					not worry about losing progress.
				</div>
				<div className="paragraph">Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to
					see more tips.
				</div>
				<div className="paragraph" style={{marginTop: 16}}>
					<Expandable title={"Troubleshoot"} titleNode={<b>Troubleshoot</b>} content={
						<div className="paragraph">
							If the browser cache is somehow messed up (likely due to invalid game states), this is how to reset it:<br/>
							Enter this tool from <b>{"https://miyehn.me/ffxiv-blm-rotation/{command}"}</b> replacing <b>{"{command}"}</b> with one of the following:
							<ul>
								<li style={smallGap}><b>resetResourceOverrides</b>: delete all resource overrides and all actions on the current timeline.</li>
								<li style={smallGap}><b>resetAll</b>: delete all browser-cached settings.</li>
							</ul>
						</div>
					}/>
				</div>
			</div>}
		/>
	</div>
}