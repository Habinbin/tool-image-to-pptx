/**
 * 이미지 목록에서 PPTX 를 만든다.
 *
 * 각 슬라이드는 이미지 하나를 `off(0,0)` `ext(슬라이드 크기)` 로 꽉 채운다.
 * 사용자가 손으로 붙이던 결과와 같은 구조다.
 *
 * 이미지 바이트는 **그대로** 넣는다. 재인코딩하지 않으므로 화질이 떨어지지 않고,
 * 큰 이미지에서도 디코딩 비용이 들지 않는다.
 */

import JSZip from 'jszip';

import type { SlideSize } from './aspect';

/** PPTX 에 넣을 이미지 한 장. */
export interface SlideImage {
	/** 원본 바이트. 그대로 media 파트가 된다. */
	bytes: Uint8Array;
	/** `png` | `jpeg` | `gif` | `webp` — {@link mediaExtension} 의 결과. */
	extension: string;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';

const REL_TYPE = {
	officeDocument: `${NS_R}/officeDocument`,
	coreProperties:
		'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
	extendedProperties: `${NS_R}/extended-properties`,
	slideMaster: `${NS_R}/slideMaster`,
	slideLayout: `${NS_R}/slideLayout`,
	slide: `${NS_R}/slide`,
	theme: `${NS_R}/theme`,
	image: `${NS_R}/image`
} as const;

const CONTENT_TYPE = {
	presentation:
		'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
	slideMaster: 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
	slideLayout: 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
	slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
	theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
	core: 'application/vnd.openxmlformats-package.core-properties+xml',
	extended: 'application/vnd.openxmlformats-officedocument.extended-properties+xml'
} as const;

const MIME_BY_EXTENSION: Record<string, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp'
};

/**
 * XML 텍스트 노드에 넣을 수 있게 이스케이프한다.
 *
 * @param value 원본 문자열.
 * @returns `&`, `<`, `>` 가 엔티티로 바뀐 문자열.
 */
function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * `<Relationships>` 파트를 만든다.
 *
 * @param entries 관계 목록.
 * @returns 완성된 XML.
 */
function relationships(entries: { id: string; type: string; target: string }[]): string {
	const items = entries
		.map((e) => `<Relationship Id="${e.id}" Type="${e.type}" Target="${e.target}"/>`)
		.join('');
	return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;
}

/**
 * `[Content_Types].xml` 을 만든다.
 *
 * @param extensions 패키지에 실제로 들어간 이미지 확장자들.
 * @param slideCount 슬라이드 수.
 * @returns 완성된 XML.
 */
function contentTypes(extensions: Set<string>, slideCount: number): string {
	const defaults = [
		'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
		'<Default Extension="xml" ContentType="application/xml"/>',
		...[...extensions].map(
			(ext) => `<Default Extension="${ext}" ContentType="${MIME_BY_EXTENSION[ext]}"/>`
		)
	].join('');

	const slides = Array.from(
		{ length: slideCount },
		(_, i) =>
			`<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="${CONTENT_TYPE.slide}"/>`
	).join('');

	return (
		`${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
		defaults +
		`<Override PartName="/ppt/presentation.xml" ContentType="${CONTENT_TYPE.presentation}"/>` +
		`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CONTENT_TYPE.slideMaster}"/>` +
		`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CONTENT_TYPE.slideLayout}"/>` +
		`<Override PartName="/ppt/theme/theme1.xml" ContentType="${CONTENT_TYPE.theme}"/>` +
		slides +
		`<Override PartName="/docProps/core.xml" ContentType="${CONTENT_TYPE.core}"/>` +
		`<Override PartName="/docProps/app.xml" ContentType="${CONTENT_TYPE.extended}"/>` +
		'</Types>'
	);
}

/**
 * `ppt/presentation.xml` 을 만든다.
 *
 * 슬라이드 관계 id 는 rId3 부터 시작한다 (rId1 = 마스터, rId2 = 테마).
 *
 * @param slideCount 슬라이드 수.
 * @param size 슬라이드 크기.
 * @returns 완성된 XML.
 */
function presentation(slideCount: number, size: SlideSize): string {
	const ids = Array.from(
		{ length: slideCount },
		(_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`
	).join('');
	const type = size.type === undefined ? '' : ` type="${size.type}"`;

	return (
		`${XML_HEADER}<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" saveSubsetFonts="1">` +
		'<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
		`<p:sldIdLst>${ids}</p:sldIdLst>` +
		`<p:sldSz cx="${size.widthEmu}" cy="${size.heightEmu}"${type}/>` +
		'<p:notesSz cx="6858000" cy="9144000"/>' +
		'</p:presentation>'
	);
}

/**
 * 이미지 하나를 꽉 채운 슬라이드 파트를 만든다.
 *
 * @param size 슬라이드 크기. 이미지 `ext` 가 이 값과 같아야 여백·잘림이 없다.
 * @returns 완성된 XML.
 */
function slide(size: SlideSize): string {
	return (
		`${XML_HEADER}<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree>` +
		'<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
		'<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
		'<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
		'<p:pic>' +
		'<p:nvPicPr><p:cNvPr id="2" name="Slide image"/>' +
		'<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>' +
		'<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
		`<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size.widthEmu}" cy="${size.heightEmu}"/></a:xfrm>` +
		'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
		'</p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
	);
}

const CLR_MAP =
	'<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2"' +
	' accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6"' +
	' hlink="hlink" folHlink="folHlink"/>';

const EMPTY_SP_TREE =
	'<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
	'<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
	'<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';

const SLIDE_MASTER =
	`${XML_HEADER}<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">` +
	`<p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_SP_TREE}</p:cSld>` +
	CLR_MAP +
	'<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
	'</p:sldMaster>';

const SLIDE_LAYOUT =
	`${XML_HEADER}<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank" preserve="1">` +
	`<p:cSld name="Blank">${EMPTY_SP_TREE}</p:cSld>` +
	'<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';

/**
 * 최소 테마. PowerPoint 는 색·글꼴·서식 구성표가 없으면 파일을 열지 않는다.
 */
const THEME = (() => {
	const colors =
		'<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
		'<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
		'<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
		'<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
		'<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
		'<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
		'<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>';

	const fontScheme =
		'<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
		'<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>';

	const fill =
		'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
		'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
		'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';

	const line =
		'<a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>'.repeat(
			3
		);

	return (
		`${XML_HEADER}<a:theme xmlns:a="${NS_A}" name="Office Theme"><a:themeElements>` +
		`<a:clrScheme name="Office">${colors}</a:clrScheme>` +
		`<a:fontScheme name="Office">${fontScheme}</a:fontScheme>` +
		'<a:fmtScheme name="Office">' +
		`<a:fillStyleLst>${fill}</a:fillStyleLst>` +
		`<a:lnStyleLst>${line}</a:lnStyleLst>` +
		'<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
		`<a:bgFillStyleLst>${fill}</a:bgFillStyleLst>` +
		'</a:fmtScheme></a:themeElements></a:theme>'
	);
})();

/** {@link buildPptx} 옵션. */
export interface BuildOptions {
	/** 슬라이드 크기. 모든 슬라이드가 이 크기를 공유한다. */
	size: SlideSize;
	/** 문서 제목. docProps 에 들어간다. */
	title?: string;
	/** 슬라이드 하나가 패키지에 들어갈 때마다 호출된다. 진행률 표시용. */
	onProgress?: (done: number, total: number) => void;
}

/**
 * 이미지들을 한 장씩 슬라이드에 꽉 채운 PPTX 로 만든다.
 *
 * @param images 슬라이드 순서대로 정렬된 이미지들.
 * @param options 슬라이드 크기와 부가 정보.
 * @returns PPTX Blob.
 * @throws 이미지가 하나도 없으면 Error.
 */
export async function buildPptx(images: SlideImage[], options: BuildOptions): Promise<Blob> {
	if (images.length === 0) throw new Error('No images to export.');

	const { size, title = 'Slides', onProgress } = options;
	const zip = new JSZip();
	const extensions = new Set<string>();

	zip.file(
		'_rels/.rels',
		relationships([
			{ id: 'rId1', type: REL_TYPE.officeDocument, target: 'ppt/presentation.xml' },
			{ id: 'rId2', type: REL_TYPE.coreProperties, target: 'docProps/core.xml' },
			{ id: 'rId3', type: REL_TYPE.extendedProperties, target: 'docProps/app.xml' }
		])
	);

	const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
	zip.file(
		'docProps/core.xml',
		`${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
			`<dc:title>${escapeXml(title)}</dc:title>` +
			`<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>` +
			`<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
			'</cp:coreProperties>'
	);
	zip.file(
		'docProps/app.xml',
		`${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
			`<Slides>${images.length}</Slides><Application>betlab-toolbox</Application></Properties>`
	);

	zip.file('ppt/presentation.xml', presentation(images.length, size));
	zip.file(
		'ppt/_rels/presentation.xml.rels',
		relationships([
			{ id: 'rId1', type: REL_TYPE.slideMaster, target: 'slideMasters/slideMaster1.xml' },
			{ id: 'rId2', type: REL_TYPE.theme, target: 'theme/theme1.xml' },
			...images.map((_, i) => ({
				id: `rId${i + 3}`,
				type: REL_TYPE.slide,
				target: `slides/slide${i + 1}.xml`
			}))
		])
	);

	zip.file('ppt/slideMasters/slideMaster1.xml', SLIDE_MASTER);
	zip.file(
		'ppt/slideMasters/_rels/slideMaster1.xml.rels',
		relationships([
			{ id: 'rId1', type: REL_TYPE.slideLayout, target: '../slideLayouts/slideLayout1.xml' },
			{ id: 'rId2', type: REL_TYPE.theme, target: '../theme/theme1.xml' }
		])
	);
	zip.file('ppt/slideLayouts/slideLayout1.xml', SLIDE_LAYOUT);
	zip.file(
		'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
		relationships([
			{ id: 'rId1', type: REL_TYPE.slideMaster, target: '../slideMasters/slideMaster1.xml' }
		])
	);
	zip.file('ppt/theme/theme1.xml', THEME);

	images.forEach((image, index) => {
		const n = index + 1;
		extensions.add(image.extension);
		zip.file(`ppt/media/image${n}.${image.extension}`, image.bytes);
		zip.file(`ppt/slides/slide${n}.xml`, slide(size));
		zip.file(
			`ppt/slides/_rels/slide${n}.xml.rels`,
			relationships([
				{ id: 'rId1', type: REL_TYPE.slideLayout, target: '../slideLayouts/slideLayout1.xml' },
				{ id: 'rId2', type: REL_TYPE.image, target: `../media/image${n}.${image.extension}` }
			])
		);
		onProgress?.(n, images.length);
	});

	zip.file('[Content_Types].xml', contentTypes(extensions, images.length));

	return zip.generateAsync({
		type: 'blob',
		mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		// 이미지는 이미 압축된 형식이다. 다시 압축하면 시간만 들고 크기는 그대로다.
		compression: 'STORE'
	});
}
