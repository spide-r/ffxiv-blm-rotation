import React, {useEffect, useRef, useState} from 'react'
import {
	CursorElem,
	DamageMarkElem,
	ElemType,
	LucidMarkElem,
	MarkerElem,
	MPTickMarkElem,
	SkillElem,
	TimelineElem, UntargetableMarkerTrack,
	ViewOnlyCursorElem,
	WarningMarkElem
} from "../Controller/Timeline";
import {StaticFn} from "./Common";
import {ResourceType, WarningType} from "../Game/Common";
// @ts-ignore
import {skillIconImages} from "./Skills";
import {controller} from "../Controller/Controller";
import {localize, localizeSkillName} from "./Localization";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";
import {getCurrentThemeColors, ThemeColors} from "./ColorTheme";
import {scrollEditorToFirstSelected} from "./TimelineEditor";

export type TimelineRenderingProps = {
	timelineWidth: number,
	timelineHeight: number,
	countdown: number,
	scale: number,
	tincturePotencyMultiplier: number,
	untargetableMask: boolean,
	allMarkers: MarkerElem[],
	untargetableMarkers: MarkerElem[],
	elements: TimelineElem[],
	selectionStartX: number,
	selectionEndX: number,
}

const trackHeight = 14;
const trackBottomMargin = 6;
const maxTimelineHeight = 400;
const barsOffset = 2;

let g_visibleLeft = 0;
let g_visibleWidth = 0;
let g_isClickUpdate = false;
let g_clickEvent: any = undefined; // valid when isClickUpdate is true
let g_isKeyboardUpdate = false;
let g_keyboardEvent: any = undefined;
let g_mouseX = 0;
let g_mouseY = 0;
let g_mouseHovered = false;

let g_colors: ThemeColors;

// updated on mouse enter/leave, updated and reset on every draw
let g_activeHoverTip: string[] | undefined = undefined;
let g_activeOnClick: (()=>void) | undefined = undefined;

let renderingProps: TimelineRenderingProps = {
	timelineWidth: 0,
	timelineHeight: 0,
	countdown: 0,
	scale: 1,
	tincturePotencyMultiplier: 1,
	allMarkers: [],
	untargetableMarkers: [],
	untargetableMask: true,
	elements: [],
	selectionStartX: 0,
	selectionEndX: 0,
};

let readback_pointerMouse = false;

// qol: event capture mask? So can provide a layer that overwrites keyboard event only and not affect the rest
// all coordinates in canvas space
function testInteraction(
	rect: Rect,
	hoverTip?: string[],
	onClick?: ()=>void,
	pointerMouse?: boolean)
{
	if (g_mouseX >= rect.x && g_mouseX < rect.x + rect.w && g_mouseY >= rect.y && g_mouseY < rect.y + rect.h) {
		g_activeHoverTip = hoverTip;
		g_activeOnClick = onClick;
		if (pointerMouse === true) readback_pointerMouse = true;
	}
}

const onClickTimelineBackground = ()=>{
	// clicked on background:
	controller.record.unselectAll();
	controller.displayCurrentState();
};

function drawTip(ctx: CanvasRenderingContext2D, lines: string[], canvasWidth: number, canvasHeight: number) {
	if (!lines.length) return;

	const lineHeight = 14;
	const horizontalPadding = 8;
	const verticalPadding = 4;
	ctx.font = "12px monospace";

	let maxLineWidth = -1;
	lines.forEach(l=>{ maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width); });
	let [boxWidth, boxHeight] = [maxLineWidth + 2 * horizontalPadding, lineHeight * lines.length + 2 * verticalPadding];

	let x = g_mouseX;
	let y = g_mouseY;

	// compute optimal box position
	const boxToMousePadding = 4;
	const estimatedMouseHeight = 11;
	if (y >= boxHeight + boxToMousePadding) { // put on top
		y = y - boxHeight - boxToMousePadding;
	} else {
		y = y + estimatedMouseHeight + boxToMousePadding;
	}
	if (x - boxWidth / 2 >= 0 && x + boxWidth / 2 < canvasWidth) {
		x = x - boxWidth / 2;
	} else if (x - boxWidth / 2 < 0) {
		x = 0;
	} else {
		x = canvasWidth - boxWidth;
	}

	// start drawing
	ctx.strokeStyle = g_colors.bgHighContrast;
	ctx.lineWidth = 1;
	ctx.fillStyle = g_colors.tipBackground;
	ctx.fillRect(x, y, boxWidth, boxHeight);
	ctx.strokeRect(x, y, boxWidth, boxHeight);

	ctx.fillStyle = g_colors.emphasis;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], x + horizontalPadding, y + i * lineHeight + 2 + verticalPadding);
	}
}

function drawMarkers(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	markerTracksTopY: number,
	markerTracksBottomY: number, // bottom Y of track 0
	timelineOrigin: number,
	trackBins: Map<number, MarkerElem[]>,
) {
	// markers
	ctx.lineCap = "round";
	ctx.lineWidth = 4;
	ctx.font = "11px monospace";
	ctx.textAlign = "left";
	trackBins.forEach((elems, track)=>{
		let top = markerTracksBottomY - (track + 1) * trackHeight;
		if (track === UntargetableMarkerTrack) {
			top = markerTracksTopY;
		}
		for (let i = 0; i < elems.length; i++) {
			let m = elems[i];
			if (track === UntargetableMarkerTrack) m.description = localize({en: "Untargetable", zh: "不可选中"}) as string;
			let left = timelineOrigin + StaticFn.positionFromTimeAndScale(m.time + countdown, scale);
			let onClick = ()=>{
				let success = controller.timeline.deleteMarker(m);
				console.assert(success);
				controller.updateStats();
				setEditingMarkerValues(m);
			};
			if (m.duration > 0) {
				let markerWidth = StaticFn.positionFromTimeAndScale(m.duration, scale);
				if (m.showText) {
					ctx.fillStyle = m.color + g_colors.timeline.markerAlpha;
					ctx.fillRect(left, top, markerWidth, trackHeight);
					ctx.fillStyle = g_colors.emphasis;
					ctx.fillText(m.description, left + trackHeight / 2, top + 10);
				} else {
					ctx.strokeStyle = m.color;
					ctx.beginPath();
					ctx.moveTo(left, top + trackHeight / 2);
					ctx.lineTo(left + markerWidth, top + trackHeight / 2);
					ctx.stroke();
				}
				let timeStr = m.time + " - " + parseFloat((m.time + m.duration).toFixed(3));
				testInteraction(
					{x: left, y: top, w: Math.max(markerWidth, trackHeight), h: trackHeight},
					["[" + timeStr + "] " + m.description],
					onClick);
			} else {
				ctx.fillStyle = m.color;
				ctx.beginPath();
				ctx.ellipse(left, top + trackHeight / 2, 4, 4, 0, 0, 2 * Math.PI);
				ctx.fill();
				if (m.showText) {
					ctx.fillStyle = g_colors.emphasis;
					ctx.beginPath()
					ctx.fillText(m.description, left + trackHeight / 2, top + 10);
				}
				testInteraction(
					{x: left - trackHeight / 2, y: top, w: trackHeight, h: trackHeight},
					["[" + m.time + "] " + m.description],
					onClick);
			}
		}
	});
}

function drawMPTickMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: MPTickMarkElem[]
) {
	ctx.lineWidth = 1;
	ctx.strokeStyle = g_colors.timeline.mpTickMark;
	ctx.beginPath();
	elems.forEach(tick=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(tick.time, scale);
		ctx.moveTo(x, 30);
		ctx.lineTo(x, maxTimelineHeight);

		testInteraction(
			{x: x-2, y: 30, w: 4, h: maxTimelineHeight-30},
			["[" + tick.displayTime.toFixed(2) + "] " + tick.source]
		);
	});
	ctx.stroke();
}

function drawWarningMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: WarningMarkElem[]
) {
	ctx.font = "bold 10px monospace";
	elems.forEach(mark=>{
		const x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		const y = 30;
		const sideLength = 12;
		ctx.beginPath();
		ctx.textAlign = "center";
		ctx.moveTo(x, y-sideLength);
		ctx.lineTo(x-sideLength/2, y);
		ctx.lineTo(x+sideLength/2, y);
		ctx.fillStyle = g_colors.timeline.warningMark;
		ctx.fill();
		ctx.fillStyle = "white";
		ctx.fillText("!", x, y-1);

		let message: string = "[" + mark.displayTime.toFixed(2) + "] ";
		if (mark.warningType === WarningType.PolyglotOvercap) {
			message += localize({en: "polyglot overcap!", zh: "通晓溢出！"});
		}

		testInteraction(
			{x: x-sideLength/2, y: y-sideLength, w: sideLength, h: sideLength}, [message]
		);
	});
}

function bossIsUntargetable(t: number) {
	if (!renderingProps.untargetableMask) return false;
	for (let i = 0; i < renderingProps.untargetableMarkers.length; i++) {
		let m = renderingProps.untargetableMarkers[i];
		if (t >= m.time && t < m.time + m.duration) return true;
	}
	return false;
}

function drawDamageMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: DamageMarkElem[]
) {
	elems.forEach(mark=>{
		let untargetable = bossIsUntargetable(mark.time - countdown);
		ctx.fillStyle = untargetable ? g_colors.timeline.untargetableDamageMark : g_colors.timeline.damageMark;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		ctx.beginPath();
		ctx.moveTo(x-3, 0);
		ctx.lineTo(x+3, 0);
		ctx.lineTo(x, 6);
		ctx.fill();

		let dm = mark;
		// pot?
		let pot = false;
		dm.buffs.forEach(b=>{
			if (b===ResourceType.Tincture) pot = true;
		});
		// hover text
		let time = "[" + dm.displayTime.toFixed(2) + "] ";
		let untargetableStr = localize({en: "Untargetable", zh: "不可选中"}) as string;
		let info = "";
		if (untargetable) {
			info = (0).toFixed(2) + " (" + dm.source + ")";
		} else {
			info = dm.potency.getAmount({tincturePotencyMultiplier: renderingProps.tincturePotencyMultiplier}).toFixed(2) + " (" + dm.source + ")";
			if (pot) info += " (" + localize({en: "pot", zh: "爆发药"}) + ")";
		}

		testInteraction(
			{x: x-3, y: 0, w: 6, h: 6},
			untargetable ? [time + info, untargetableStr] : [time + info]
		);
	});
}
function drawLucidMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: LucidMarkElem[]
) {
	ctx.fillStyle = g_colors.timeline.lucidTickMark;
	elems.forEach(mark=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		ctx.beginPath();
		ctx.moveTo(x-3, 0);
		ctx.lineTo(x+3, 0);
		ctx.lineTo(x, 6);
		ctx.fill();

		// hover text
		let hoverText = "[" + mark.displayTime.toFixed(2) + "] " + mark.source;
		testInteraction(
			{x: x-3, y: 0, w: 6, h: 6},
			[hoverText]
		);
	});
}

type Rect = {x: number, y: number ,w: number, h: number};
function drawSkills(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	skillsTopY: number,
	elems: SkillElem[]
) {
	let greyLockBars: Rect[] = [];
	let purpleLockBars: Rect[] = [];
	let gcdBars: Rect[] = [];
	let snapshots: number[] = [];
	let llCovers: Rect[] = [];
	let potCovers: Rect[] = [];
	let skillIcons: {elem: SkillElem, x: number, y: number}[] = []; // tmp
	elems.forEach(e=>{
		let skill = e as SkillElem;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(skill.time, scale);
		let y = skill.isGCD ? (skillsTopY + 14) : skillsTopY;
		// purple/grey bar
		let lockbarWidth = StaticFn.positionFromTimeAndScale(skill.lockDuration, scale);
		if (skill.isSpellCast) {
			purpleLockBars.push({x: x+barsOffset, y: y, w: lockbarWidth-barsOffset, h: 14});
			snapshots.push(x + StaticFn.positionFromTimeAndScale(skill.relativeSnapshotTime, scale));
		} else {
			greyLockBars.push({x: x+barsOffset, y: y, w: lockbarWidth-barsOffset, h: 28});
		}
		// green gcd recast bar
		if (skill.isGCD) {
			let recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			gcdBars.push({x: x+barsOffset, y: y + 14, w: recastWidth-barsOffset, h: 14});
		}
		// ll cover
		if (skill.node.hasBuff(ResourceType.LeyLines)) {
			llCovers.push({x: x, y: y + 28, w: 28, h: 4});
			if (skill.node.hasBuff(ResourceType.Tincture)) {
				potCovers.push({x: x, y: y + 32, w: 28, h: 4});
			}
		} else if (skill.node.hasBuff(ResourceType.Tincture)) {
			potCovers.push({x: x, y: y + 28, w: 28, h: 4});
		}
		// pot cover
		// skill icon
		let img = skillIconImages.get(skill.skillName);
		if (img) skillIcons.push({elem: e, x: x, y: y});
	});

	// purple
	ctx.fillStyle = g_colors.timeline.castBar;
	ctx.beginPath();
	purpleLockBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	ctx.fill();

	// snapshot bar
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(151, 85, 239, 0.4)";
	ctx.beginPath();
	snapshots.forEach(x=>{
		ctx.moveTo(x, skillsTopY + 14);
		ctx.lineTo(x, skillsTopY + 28);
	});
	ctx.stroke();

	// green
	ctx.fillStyle = g_colors.timeline.gcdBar;
	ctx.beginPath();
	gcdBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	ctx.fill();

	// grey
	ctx.fillStyle = g_colors.timeline.lockBar;
	ctx.beginPath();
	greyLockBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	ctx.fill();

	// llCovers
	ctx.fillStyle = g_colors.timeline.llCover;
	ctx.beginPath();
	llCovers.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	ctx.fill();

	// potCovers
	ctx.fillStyle = g_colors.timeline.potCover;
	ctx.beginPath();
	potCovers.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	ctx.fill();

	// icons
	ctx.beginPath();
	skillIcons.forEach(icon=>{
		ctx.drawImage(skillIconImages.get(icon.elem.skillName), icon.x, icon.y, 28, 28);
		let node = icon.elem.node;
		// 1. description
		let description = localizeSkillName(icon.elem.skillName) + "@" + (icon.elem.displayTime).toFixed(2);
		if (node.hasBuff(ResourceType.LeyLines)) description += localize({en: " (LL)", zh: " (黑魔纹)"});
		if (node.hasBuff(ResourceType.Tincture)) description += localize({en: " (pot)", zh: "(爆发药)"});
		let lines = [description];
		let potency = node.getPotency({
			tincturePotencyMultiplier: renderingProps.tincturePotencyMultiplier,
			untargetable: bossIsUntargetable
		}).applied;
		// 2. potency
		if (node.getPotencies().length > 0) {
			lines.push(localize({en: "potency: ", zh: "威力："}) + potency.toFixed(2));
		}
		// 3. duration
		let lockDuration = 0;
		if (node.tmp_endLockTime!==undefined && node.tmp_startLockTime!==undefined) {
			lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
		}
		lines.push(localize({en: "duration: ", zh: "耗时："}) + lockDuration.toFixed(2));
		testInteraction(
			{x: icon.x, y: icon.y, w: 28, h: 28},
			lines,
			()=>{
				controller.timeline.onClickTimelineAction(node, g_clickEvent ? g_clickEvent.shiftKey : false);
				scrollEditorToFirstSelected();
			},
			true);
	});
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, color: string, tip: string) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x-3, 0);
	ctx.lineTo(x+3, 0);
	ctx.lineTo(x, 6);
	ctx.fill();

	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, maxTimelineHeight);
	ctx.stroke();

	testInteraction({x: x-3, y: 0, w: 6, h: maxTimelineHeight}, [tip]);
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawTimeline(ctx: CanvasRenderingContext2D) {

	let timelineOrigin = -g_visibleLeft;

	// background white
	ctx.fillStyle = g_colors.background;
	// add 1 here because this scaled dimension from dpr may not perfectly cover the entire canvas
	ctx.fillRect(0, 0, g_visibleWidth + 1, renderingProps.timelineHeight + 1);
	testInteraction({x: 0, y: 0, w: g_visibleWidth, h: maxTimelineHeight}, undefined, onClickTimelineBackground);

	// ruler bg
	ctx.fillStyle = g_colors.timeline.ruler;
	ctx.fillRect(0, 0, g_visibleWidth, 30);
	let t = StaticFn.timeFromPositionAndScale(g_mouseX - timelineOrigin, renderingProps.scale);
	testInteraction(
		{x: 0, y: 0, w: g_visibleWidth, h: 30},
		[(t - renderingProps.countdown).toFixed(2)],
		()=>{
			if (t < controller.game.time) {
				controller.displayHistoricalState(t, undefined); // replay the actions as-is
			} else {
				controller.displayCurrentState();
			}
		});

	// ruler marks
	ctx.lineCap = "butt";
	ctx.beginPath();
	let pixelsPerSecond = renderingProps.scale * 100;
	let countdownPadding = renderingProps.countdown * pixelsPerSecond;
	ctx.lineWidth = 1;
	ctx.strokeStyle = g_colors.text;
	ctx.textBaseline = "alphabetic";

	ctx.font = "13px monospace";
	ctx.textAlign = "center";
	ctx.fillStyle = g_colors.text;
	const cullThreshold = 50;
	if (pixelsPerSecond >= 6) {
		for (let x = 0; x < renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
		for (let x = -pixelsPerSecond; x >= -countdownPadding; x -= pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
	}
	for (let x = 0; x < renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	for (let x = -pixelsPerSecond * 5; x >= -countdownPadding; x -= pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	ctx.stroke();

	// make trackbins
	let trackBins = new Map<number, MarkerElem[]>();
	renderingProps.allMarkers.forEach(marker=>{
		let trackBin = trackBins.get(marker.track);
		if (trackBin === undefined) trackBin = [];
		trackBin.push(marker);
		trackBins.set(marker.track, trackBin);
	});

	// tracks background
	ctx.beginPath();
	let numTracks = 0;
	let hasUntargetableTrack = false;
	for (let k of trackBins.keys()) {
		numTracks = Math.max(numTracks, k + 1);
		if (k === UntargetableMarkerTrack) hasUntargetableTrack = true;
	}
	if (hasUntargetableTrack) numTracks += 1;
	let markerTracksTopY = 30;
	let markerTracksBottomY = 30 + numTracks * trackHeight;
	ctx.fillStyle = g_colors.timeline.tracks;
	for (let i = 0; i < numTracks; i += 2) {
		let top = markerTracksBottomY - (i + 1) * trackHeight;
		ctx.rect(0, top, g_visibleWidth, trackHeight);
	}
	ctx.fill();

	// organize elems into bins
	let elemBins = new Map<ElemType, TimelineElem[]>();
	renderingProps.elements.forEach(e=>{
		let arr = elemBins.get(e.type) ?? [];
		arr.push(e);
		elemBins.set(e.type, arr);
	});

	// mp tick marks
	drawMPTickMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[] ?? []);

	// timeline markers
	drawMarkers(ctx, renderingProps.countdown, renderingProps.scale, markerTracksTopY, markerTracksBottomY, timelineOrigin, trackBins);

	// damage marks
	drawDamageMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.DamageMark) as DamageMarkElem[] ?? []);

	// lucid marks
	drawLucidMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.LucidMark) as LucidMarkElem[] ?? []);

	// warning marks (polyglot overcap)
	drawWarningMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.WarningMark) as WarningMarkElem[] ?? []);

	// skills
	let skillsTopY = 30 + numTracks * trackHeight + trackBottomMargin;
	drawSkills(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, skillsTopY, elemBins.get(ElemType.Skill) as SkillElem[] ?? []);

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(renderingProps.countdown, renderingProps.scale);
	ctx.fillStyle = g_colors.timeline.countdown;
	ctx.fillRect(timelineOrigin, 0, countdownWidth, renderingProps.timelineHeight);

	// selection rect
	ctx.fillStyle = "rgba(147, 112, 219, 0.15)";
	let selectionLeftPx = timelineOrigin + renderingProps.selectionStartX;
	let selectionWidthPx = renderingProps.selectionEndX - renderingProps.selectionStartX;
	ctx.fillRect(selectionLeftPx, 0, selectionWidthPx, maxTimelineHeight);
	ctx.strokeStyle = "rgba(147, 112, 219, 0.5)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(selectionLeftPx, 0);
	ctx.lineTo(selectionLeftPx, maxTimelineHeight);
	ctx.moveTo(selectionLeftPx + selectionWidthPx, 0);
	ctx.lineTo(selectionLeftPx + selectionWidthPx, maxTimelineHeight);
	ctx.stroke();

	// view only cursor
	(elemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach(cursor=>{
		let vcursor = cursor as ViewOnlyCursorElem
		if (vcursor.enabled) {
			let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, renderingProps.scale);
			drawCursor(ctx, x, g_colors.historical, localize({en: "cursor: ", zh: "光标："}) + vcursor.displayTime.toFixed(2));
		}
	});

	// cursor
	(elemBins.get(ElemType.s_Cursor) ?? []).forEach(elem=>{
		let cursor = elem as CursorElem;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, renderingProps.scale);
		drawCursor(ctx, x, g_colors.emphasis, localize({en: "cursor: ", zh: "光标："}) + cursor.displayTime.toFixed(2));
	});

	// interactive layer
	if (g_mouseHovered) {
		if (g_activeHoverTip) {
			drawTip(ctx, g_activeHoverTip, g_visibleWidth, renderingProps.timelineHeight);
		}
		if (g_isClickUpdate && g_activeOnClick) {
			g_activeOnClick();
		}
	}
}

// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM

export function TimelineCanvas(props: {
	timelineHeight: number,
	visibleLeft: number,
	visibleWidth: number,
	version: number
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const dpr = window.devicePixelRatio;
	let scaledWidth = props.visibleWidth * dpr;
	let scaledHeight = props.timelineHeight * dpr;

	const [mouseX, setMouseX] = useState(0);
	const [mouseY, setMouseY] = useState(0);
	const [mouseHovered, setMouseHovered] = useState(false);
	const [clickCounter, setClickCounter] = useState(0);
	const [keyCounter, setKeyCounter] = useState(0);

	// background layer
	let bgProps = [
		props.visibleLeft, props.visibleWidth, mouseX, mouseY, mouseHovered, clickCounter, keyCounter, props.version
	];
	useEffect(()=>{
		g_activeHoverTip = undefined;
		g_activeOnClick = undefined;
		g_visibleLeft = props.visibleLeft;
		g_visibleWidth = props.visibleWidth;
		g_colors = getCurrentThemeColors();

		readback_pointerMouse = false;

		// gather global values
		renderingProps = controller.getTimelineRenderingProps();

		// draw
		let ctx = canvasRef.current?.getContext("2d", {alpha: false});
		if (ctx) {
			ctx.scale(dpr, dpr);
			drawTimeline(ctx);
			ctx.scale(1 / dpr, 1 / dpr);
		}

		// reset event flags
		g_isClickUpdate = false;
		g_isKeyboardUpdate = false;
	}, bgProps);

	return <canvas ref={canvasRef} width={Math.ceil(scaledWidth)} height={Math.ceil(scaledHeight)} tabIndex={0} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		top: 0,
		left: props.visibleLeft,
		outline: "none",
		cursor: readback_pointerMouse ? "pointer" : "default",
	}} onMouseMove={e=>{
		if (canvasRef.current) {
			let rect = canvasRef.current.getBoundingClientRect();
			g_mouseX = e.clientX - rect.left;
			g_mouseY = e.clientY - rect.top;
			setMouseX(g_mouseX);
			setMouseY(g_mouseY);
		}
	}} onMouseEnter={e=>{
		setMouseHovered(true);
		g_mouseHovered = true;
	}} onMouseLeave={e=>{
		setMouseHovered(false);
		g_mouseHovered = false;
	}} onClick={e=>{
		setClickCounter(clickCounter + 1);
		g_isClickUpdate = true;
		g_clickEvent = e;
	}} onKeyDown={e=>{
		setKeyCounter(keyCounter + 1);
		g_isKeyboardUpdate = true;
		g_keyboardEvent = e;
		if (g_keyboardEvent.key === "Backspace" || g_keyboardEvent.key === "Delete") {
			let firstSelected = controller.record.getFirstSelection();
			if (firstSelected) {
				controller.rewindUntilBefore(firstSelected, false);
				controller.displayCurrentState();
				controller.updateAllDisplay();
				controller.autoSave();
			}
		}
	}}/>;
}
