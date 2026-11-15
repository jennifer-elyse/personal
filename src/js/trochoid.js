/**
 * @typedef {'inside' | 'outside' | 'line'} TrochoidKind
 * @typedef {{ kind: TrochoidKind, R: number, r: number, d: number }} Trochoid
 * @typedef {{ x: number, y: number, cx: number, cy: number }} Pose
 */

const canvas = document.querySelector('#field');
const form = document.querySelector('#controls');
const readout = document.querySelector('#readout');

if (!(canvas instanceof HTMLCanvasElement) || !(form instanceof HTMLFormElement) || !readout) {
	throw new Error('Trochoid page is missing its canvas or controls.');
}

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas is unavailable.');

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const names = {
	inside: 'Hypotrochoid',
	outside: 'Epitrochoid',
	line: 'Trochoid',
};

let signature = '';
let started = performance.now();
let frame = 0;
let running = false;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y) {
		const next = x % y;
		x = y;
		y = next;
	}
	return x || 1;
}

/** @returns {Trochoid} */
function readSpec() {
	const data = new FormData(form);
	const kindValue = String(data.get('kind') || 'inside');
	/** @type {TrochoidKind} */
	const kind = kindValue === 'outside' || kindValue === 'line' ? kindValue : 'inside';
	const R = clamp(Number(data.get('R')), 24, 140);
	let r = clamp(Number(data.get('r')), 6, 90);
	const d = clamp(Number(data.get('d')), 4, 120);
	if (kind === 'inside') r = Math.min(r, Math.max(6, R - 1));
	return { kind, R, r, d };
}

/**
 * @param {Trochoid} spec
 * @param {number} theta
 * @returns {Pose}
 */
function pose(spec, theta) {
	const { kind, R, r, d } = spec;
	if (kind === 'line') {
		const cx = r * theta;
		const cy = r;
		return {
			cx,
			cy,
			x: cx - d * Math.sin(theta),
			y: cy - d * Math.cos(theta),
		};
	}
	const inside = kind === 'inside';
	const arm = inside ? R - r : R + r;
	const k = arm / r;
	const cx = arm * Math.cos(theta);
	const cy = arm * Math.sin(theta);
	const penX = (inside ? d : -d) * Math.cos(k * theta);
	const penY = -d * Math.sin(k * theta);
	return { cx, cy, x: cx + penX, y: cy + penY };
}

/**
 * @param {Trochoid} spec
 * @returns {{ start: number, end: number }}
 */
function thetaRange(spec) {
	if (spec.kind === 'line') return { start: 0, end: Math.PI * 4 };
	const turns = spec.r / gcd(Math.round(spec.R), Math.round(spec.r));
	return { start: 0, end: Math.PI * 2 * turns };
}

/**
 * @param {Trochoid} spec
 */
function publish(spec) {
	const fixed = spec.kind === 'line' ? '' : ` · fixed ${spec.R}`;
	readout.textContent = `${names[spec.kind]} · wheel ${spec.r} · pen ${spec.d}${fixed}`;
	const outR = document.querySelector('#out-R');
	const outr = document.querySelector('#out-r');
	const outd = document.querySelector('#out-d');
	if (outR) outR.textContent = String(spec.R);
	if (outr) outr.textContent = String(spec.r);
	if (outd) outd.textContent = String(spec.d);
	const described = spec.kind === 'line'
		? 'A trochoid traced by a pen on a circle rolling along a straight line.'
		: spec.kind === 'outside'
			? 'An epitrochoid traced by a pen on a circle rolling around another circle.'
			: 'A hypotrochoid traced by a pen on a circle rolling inside another circle.';
	canvas.setAttribute('aria-label', described);
	canvas.setAttribute('role', 'img');
}

/** @returns {Trochoid} */
function specNow() {
	const spec = readSpec();
	const next = `${spec.kind}:${spec.R}:${spec.r}:${spec.d}`;
	if (next !== signature) {
		signature = next;
		started = performance.now();
		publish(spec);
	}
	return spec;
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Trochoid} spec
 * @param {{ start: number, end: number }} range
 * @param {number} steps
 * @param {(x: number, y: number) => { x: number, y: number }} map
 * @param {number} until
 */
function strokeCurve(context, spec, range, steps, map, until) {
	context.beginPath();
	for (let i = 0; i <= until; i += 1) {
		const theta = range.start + ((range.end - range.start) * i) / steps;
		const point = pose(spec, theta);
		const plotted = map(point.x, point.y);
		if (i === 0) context.moveTo(plotted.x, plotted.y);
		else context.lineTo(plotted.x, plotted.y);
	}
	context.stroke();
}

/** @param {number} now */
function drawFrame(now) {
	const spec = specNow();
	const range = thetaRange(spec);
	const turns = (range.end - range.start) / (Math.PI * 2);
	const duration = Math.min(16000, Math.max(8000, turns * 3200));
	const progress = motion.matches ? 0 : ((now - started) % duration) / duration;

	const rect = canvas.getBoundingClientRect();
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
	const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, rect.width, rect.height);

	const controls = document.querySelector('.controls');
	const controlsHeight = controls ? rect.bottom - controls.getBoundingClientRect().top : rect.height * 0.24;
	const view = {
		left: rect.width * 0.08,
		top: rect.height * 0.06,
		width: rect.width * 0.84,
		height: Math.max(80, rect.height - rect.height * 0.06 - controlsHeight - 10),
	};

	const steps = Math.min(3600, Math.max(720, Math.round(turns * 480)));
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	/** @param {number} x @param {number} y */
	const include = (x, y) => {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	};

	if (spec.kind !== 'line') {
		include(-spec.R, -spec.R);
		include(spec.R, spec.R);
	}
	for (let i = 0; i <= steps; i += 1) {
		const theta = range.start + ((range.end - range.start) * i) / steps;
		const point = pose(spec, theta);
		include(point.x, point.y);
		include(point.cx - spec.r, point.cy - spec.r);
		include(point.cx + spec.r, point.cy + spec.r);
	}

	const spanX = Math.max(maxX - minX, 1);
	const spanY = Math.max(maxY - minY, 1);
	const scale = Math.min(view.width / spanX, view.height / spanY);
	const midX = (minX + maxX) / 2;
	const midY = (minY + maxY) / 2;
	/** @param {number} x @param {number} y */
	const map = (x, y) => ({
		x: view.left + view.width / 2 + (x - midX) * scale,
		y: view.top + view.height / 2 - (y - midY) * scale,
	});

	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	if (spec.kind === 'line') {
		const railY = map(0, 0).y;
		ctx.beginPath();
		ctx.moveTo(view.left, railY);
		ctx.lineTo(view.left + view.width, railY);
		ctx.strokeStyle = 'rgba(61, 42, 34, 0.28)';
		ctx.lineWidth = 1.25;
		ctx.stroke();
	} else {
		const origin = map(0, 0);
		ctx.beginPath();
		ctx.arc(origin.x, origin.y, spec.R * scale, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(154, 39, 88, 0.22)';
		ctx.lineWidth = 1.25;
		ctx.stroke();
	}

	ctx.lineWidth = 2.35;
	ctx.strokeStyle = '#9a2758';
	strokeCurve(ctx, spec, range, steps, map, steps);

	const theta = range.start + (range.end - range.start) * progress;
	const pen = pose(spec, theta);
	const center = map(pen.cx, pen.cy);
	const tip = map(pen.x, pen.y);

	ctx.beginPath();
	ctx.arc(center.x, center.y, spec.r * scale, 0, Math.PI * 2);
	ctx.strokeStyle = 'rgba(61, 42, 34, 0.72)';
	ctx.lineWidth = 1.35;
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(center.x, center.y);
	ctx.lineTo(tip.x, tip.y);
	ctx.strokeStyle = 'rgba(228, 46, 112, 0.85)';
	ctx.lineWidth = 1.25;
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#e42e70';
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#fffaf3';
	ctx.stroke();
}

function tick(now) {
	if (!running) return;
	drawFrame(now);
	frame = requestAnimationFrame(tick);
}

function start() {
	if (motion.matches) {
		running = false;
		cancelAnimationFrame(frame);
		drawFrame(performance.now());
		return;
	}
	if (running) return;
	running = true;
	frame = requestAnimationFrame(tick);
}

form.addEventListener('input', () => {
	if (motion.matches) drawFrame(performance.now());
});

form.addEventListener('submit', (event) => event.preventDefault());

motion.addEventListener('change', start);

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		running = false;
		cancelAnimationFrame(frame);
		return;
	}
	start();
});

start();
