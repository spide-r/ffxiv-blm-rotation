import React, {CSSProperties} from 'react';
import {Expandable, Help, ButtonIndicator} from "./Common";
import {localize} from "./Localization";
import {DebugOptions} from "./DebugOptions";
import changelog from "../changelog.json"
import {getCurrentThemeColors} from "./ColorTheme";

function Changelog() {
	return <div className={"paragraph"}><Expandable title={"Changelog"} titleNode={localize({en: "Changelog", zh: "更新日志", ja: "実装日志"})} defaultShow={false} content={
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
	let colors = getCurrentThemeColors();
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
			titleNode={<span>{localize({en: "Instructions ", zh: "使用说明 ", ja: "使い方"})}
				<Help topic={"expandable"} content={localize({en:"click me to expand or collapse", zh: "点击展开/折叠"})}/></span>}
			content={<div>
				<div className="paragraph">
					<b>{localize({en: "General Usage", zh: "基本用法"})}</b>
				</div>
				{localize({
					en: <ul>
						<li style={smallGap}>Set your stats in <b>Config/Edit</b> on the right, then <ButtonIndicator text={"apply and reset"}/></li>
						<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
						<li style={smallGap}>Press <ButtonIndicator text={"u"}/> to delete the last added action (effective when not running in real-time).</li>
						<li style={smallGap}>Click on a buff applied to self to remove it. Unless it's ley lines, in which case it can be re-enabled.</li>
					</ul>,
					zh: <ul>
						<li style={smallGap}>在右边 <b>设置/编辑</b> 里输入装备数据，然后点击 <ButtonIndicator text={"应用并重置时间轴"}/></li>
						<li style={smallGap}>单击使用技能，如果CD还没转好，可以再次点击，会自动等到转好然后重试。</li>
						<li style={smallGap}>按 <ButtonIndicator text={"u"}/> 删除时间线上的最后一个操作（实时模式下此操作无效）。</li>
						<li style={smallGap}>左键单击可以移除自己身上的buff。黑魔纹除外，黑魔纹在单击关闭后可以被再次点击开启。</li>
					</ul>
				})}
				<div className="paragraph">
					<b>{localize({en: "Timeline", zh: "时间轴"})}</b>
				</div>
				{localize({
					en: <ul>
						<li style={smallGap}>Holding <ButtonIndicator text={"shift"}/> lets you scroll horizontally</li>
						<li style={smallGap}>Click to select a skill on the timeline. Shift click to select a sequence of skills</li>
						<li style={smallGap}><ButtonIndicator text={"backspace"}/> or <ButtonIndicator text={"delete"}/> to delete the selected skill and everything after it</li>
						<li style={smallGap}>Click on the timeline's ruler-like header to view historical game states.
							While doing so, the main control region will have an <b style={{color: "darkorange"}}>orange</b> border
							and you will not be able to use skills. Click on somewhere else on the timeline to cancel.
						</li>
					</ul>,
					zh: <ul>
						<li style={smallGap}>按住 <ButtonIndicator text={"shift"}/> 时滑动鼠标滚轮可以横向滚动时间线。</li>
						<li style={smallGap}>单击可以选中时间轴上的技能。已经选中一个技能时，按住 <ButtonIndicator text={"shift"}/> 点击另一个技能会选中期间的所有操作。</li>
						<li style={smallGap}>按 <ButtonIndicator text={"backspace"}/> 或 <ButtonIndicator text={"delete"}/> 删除选中技能及其之后的所有操作。</li>
						<li style={smallGap}>选中某技能或者刻度上的某时间时，可以看到相应时间的职业资源状态。此时控制区域边框变为<b style={{color: "darkorange"}}>橙色</b>且无法使用技能。点击控制区域或时间轴空白处取消。
						</li>
					</ul>
				})}

				{localize({
					en: <div className={"paragraph"}><span style={{color: colors.fileDownload, cursor: "pointer"}}><u>[these]</u></span> are file download links. Click to download, or right click to choose save location.</div>,
					zh: <div className={"paragraph"}><span style={{color: colors.fileDownload, cursor: "pointer"}}><u>[这样的按钮]</u></span> 是文件下载链接，可以点击直接下载也可以右键另存为。</div>
				})}

				{localize({
					en: <div className="paragraph">Most edits are automatically saved in your browser cache, so it's generally okay to refresh the page and not worry about losing progress.</div>,
					zh: <div className="paragraph">大部分编辑都会被保存在浏览器缓存，一般情况下刷新网页也不会影响进度。</div>
				})}

				{localize({
					en: <div className="paragraph">Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to see more tips.</div>,
					zh: <div className="paragraph">鼠标悬浮在各处的 <Help topic={"sampleTips"} content={"我是一个说明"}/> 上查看更多使用说明。</div>,
				})}
				<div className="paragraph" style={{marginTop: 16}}>
					<Expandable title={"Troubleshoot"} titleNode={localize({en: <b>troubleshoot</b>, zh: <b>常见问题</b>})} content={
						localize({
						en: <div>
								<div className="paragraph">
									I can't guarantee that my updates are always backward compatible. If your fight record files aren't loading properly but you don't understand why, contact me and I'll try my best to help.
								</div>
								<div className="paragraph">
								If the browser cache is somehow messed up (likely due to invalid game states), this is how to reset it:<br/>
								Enter this tool from <b>{"https://miyehn.me/ffxiv-blm-rotation/#/{command}"}</b> replacing <b>{"{command}"}</b> with one of the following:
								<ul>
									<li style={smallGap}><b>resetResourceOverrides</b>: delete all resource overrides and all actions on the current timeline.</li>
									<li style={smallGap}><b>resetAll</b>: delete all browser-cached settings.</li>
								</ul>
							</div>
						</div>,
						zh: <div>
							<div className="paragraph">
								我无法保证每次更新都能兼容已有的战斗记录文件。如果你的战斗记录无法被正常导入但你不清楚原因，可以联系我，我会尽力帮一起看。
							</div>
							<div className="paragraph">
								如果浏览器缓存因不明原因出问题（比如预设了刚打完绝望满蓝这样的“非法状态”），可尝试用以下方法重置浏览器缓存：<br/>
								用以下链接进入本工具：<b>{"https://miyehn.me/ffxiv-blm-rotation/#/{command}"}</b>，然后把<b>{"{command}"}</b>替换成以下两个指令之一：
								<ul>
									<li style={smallGap}><b>resetResourceOverrides</b>: 删除当前时间线上的所有资源预设和技能</li>
									<li style={smallGap}><b>resetAll</b>: 删除所有本工具相关的浏览器缓存</li>
								</ul>
							</div>
						</div>
						})}/>
				</div>
			</div>}
		/>

	</div>
}