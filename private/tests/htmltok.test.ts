import {htmltok, Token, TokenType} from '../htmltok.ts';
import {htmltokStream, htmltokStreamArray} from '../htmltok_stream.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.7/equals';

// deno-lint-ignore no-explicit-any
type Any = any;

function stringReader(str: string, isByob=false, chunkSize=10, encoding='utf-8')
{	let data: Uint8Array;
	let pos = 0;

	if (encoding == 'utf-16le')
	{	data = encodeToUtf16(str, true);
	}
	else if (encoding == 'utf-16be')
	{	data = encodeToUtf16(str, false);
	}
	else
	{	data = new TextEncoder().encode(str);
	}

	if (!isByob)
	{	return new ReadableStream
		(	{	pull(controller)
				{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos));
					pos += chunk.length;
					controller.enqueue(chunk);
					if (pos >= data.length)
					{	controller.close();
					}
				}
			}
		);
	}
	else
	{	return new ReadableStream
		(	{	type: 'bytes',
				pull(controller)
				{	const view = controller.byobRequest?.view;
					if (!view)
					{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos));
						pos += chunk.length;
						controller.enqueue(chunk);
					}
					else
					{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos, view.byteLength));
						pos += chunk.length;
						new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(chunk, 0);
						controller.byobRequest.respond(chunk.length);
					}
					if (pos >= data.length)
					{	controller.close();
					}
				}
			}
		);
	}
}

function encodeToUtf16(str: string, isLittleEndian=false)
{	const buffer = new ArrayBuffer(str.length * 2);
	const view = new DataView(buffer);
	for (let i=0, iEnd=str.length, j=0; i<iEnd; i++, j+=2)
	{	view.setUint16(j, str.charCodeAt(i), isLittleEndian);
	}
	return new Uint8Array(buffer);
}

const RE_NORM = /[\r\n]+([ \t]*)/g;

function normalizeIndent(str: string, newIndent='')
{	str = str.trim();
	let common: string|undefined;
	RE_NORM.lastIndex = 0;
	let m;
	while ((m = RE_NORM.exec(str)))
	{	const indent = m[1];
		if (common == undefined)
		{	common = indent;
		}
		let len = common.length;
		while (len>0 && indent.indexOf(common)==-1)
		{	common = common.slice(0, --len);
		}
	}
	if (common == undefined)
	{	common = '';
	}
	const r = str.indexOf('\r');
	const endl = r==-1 ? '\n' : str.charAt(r+1)=='\n' ? '\r\n' : '\r';
	return newIndent + str.replaceAll(endl+common, endl+newIndent);
}

Deno.test
(	'Basic',
	() =>
	{	const source = `<Div>Text &amp; text & text.</div>Line 1.\nLine 2.<br>And also this: <.`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<Div"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 6,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Text "},
				{nLine: 1,  nColumn: 11, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ENTITY,                       text: "&amp;"},
				{nLine: 1,  nColumn: 16, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " text "},
				{nLine: 1,  nColumn: 22, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_AMP,                      text: "&"},
				{nLine: 1,  nColumn: 23, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " text."},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line 1.\nLine 2."},
				{nLine: 2,  nColumn: 8,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 2,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "And also this: "},
				{nLine: 2,  nColumn: 27, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_LT,                       text: "<"},
				{nLine: 2,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "."},
				{nLine: 2,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "."},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Parallel',
	() =>
	{	const source = `<Div>Text &amp; text & text.</div>Line 1.\nLine 2.<br>And also this: <.`;
		const it1 = htmltok(source);
		const it2 = htmltok(source);
		const tokens1: Token[] = [];
		const tokens2: Token[] = [];
		for (let done=0; done!=3;)
		{	const which = Math.random() > 0.5;
			const token = (which ? it1 : it2).next().value;
			if (!token)
			{	done |= which ? 1 : 2;
			}
			else
			{	(which ? tokens1 : tokens2).push(token);
			}
		}
		assertEquals(tokens1, tokens2);
		assertEquals(tokens1.join(''), source);
		assertEquals
		(	tokens1.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<Div"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 6,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Text "},
				{nLine: 1,  nColumn: 11, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ENTITY,                       text: "&amp;"},
				{nLine: 1,  nColumn: 16, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " text "},
				{nLine: 1,  nColumn: 22, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_AMP,                      text: "&"},
				{nLine: 1,  nColumn: 23, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " text."},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line 1.\nLine 2."},
				{nLine: 2,  nColumn: 8,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 2,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "And also this: "},
				{nLine: 2,  nColumn: 27, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_LT,                       text: "<"},
				{nLine: 2,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "."},
				{nLine: 2,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "."},
			]
		);
	}
);

Deno.test
(	'Basic 2',
	() =>
	{	const source = `<input type=text value='One'> <br > <hr /> <img src='data:,'/> <a id=a/>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "input",   isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<input"},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "input",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "type"},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "input",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "text"},
				{nLine: 1,  nColumn: 17, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 18, level: 0, tagName: "input",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "value"},
				{nLine: 1,  nColumn: 23, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 24, level: 0, tagName: "input",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "'One'"},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 31, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 34, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 36, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 37, level: 0, tagName: "hr",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<hr"},
				{nLine: 1,  nColumn: 40, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 41, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: "/>"},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 44, level: 0, tagName: "img",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<img"},
				{nLine: 1,  nColumn: 48, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 49, level: 0, tagName: "img",     isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "src"},
				{nLine: 1,  nColumn: 52, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 53, level: 0, tagName: "img",     isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "'data:,'"},
				{nLine: 1,  nColumn: 61, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: "/>"},
				{nLine: 1,  nColumn: 63, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 64, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<a id=a/>"},
				{nLine: 1,  nColumn: 64, level: 0, tagName: "a",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<a"},
				{nLine: 1,  nColumn: 66, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 67, level: 0, tagName: "a",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "id"},
				{nLine: 1,  nColumn: 69, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 70, level: 0, tagName: "a",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "a"},
				{nLine: 1,  nColumn: 71, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "/"},
				{nLine: 1,  nColumn: 72, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 73, level: 0, tagName: "a",       isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</a>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Basic 3',
	() =>
	{	const source = `<cus2-tag a="1\n2\n3"\nat\n>.  </cus2-tag\n>;`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "cus2-tag",isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<cus2-tag"},
				{nLine: 1,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "cus2-tag",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "cus2-tag",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"1\n2\n3\""},
				{nLine: 3,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\n"},
				{nLine: 4,  nColumn: 1,  level: 0, tagName: "cus2-tag",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "at"},
				{nLine: 4,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\n"},
				{nLine: 5,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 5,  nColumn: 2,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: ".  "},
				{nLine: 5,  nColumn: 5,  level: 0, tagName: "cus2-tag",isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</cus2-tag\n>"},
				{nLine: 6,  nColumn: 2,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: ";"},
				{nLine: 6,  nColumn: 2,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: ";"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Fix structure',
	() =>
	{	const source = `<div><span a="1"b="2">Hello</div>\n  <div>A<b>B<u>BU</b>U</div>\n`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<div"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 6,  level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<span"},
				{nLine: 1,  nColumn: 11, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 12, level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 13, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 14, level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"1\""},
				{nLine: 1,  nColumn: 17, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE, text: " "},
				{nLine: 1,  nColumn: 17, level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "b"},
				{nLine: 1,  nColumn: 18, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 19, level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"2\""},
				{nLine: 1,  nColumn: 22, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 23, level: 2, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Hello"},
				{nLine: 1,  nColumn: 28, level: 1, tagName: "span",    isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</span>"},
				{nLine: 1,  nColumn: 28, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"},
				{nLine: 1,  nColumn: 34, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n  "},
				{nLine: 2,  nColumn: 3,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<div"},
				{nLine: 2,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 8,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "A"},
				{nLine: 2,  nColumn: 9,  level: 1, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<b"},
				{nLine: 2,  nColumn: 11, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 12, level: 2, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "B"},
				{nLine: 2,  nColumn: 13, level: 2, tagName: "u",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<u"},
				{nLine: 2,  nColumn: 15, level: 2, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 16, level: 3, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "BU"},
				{nLine: 2,  nColumn: 18, level: 2, tagName: "u",       isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</u>"},
				{nLine: 2,  nColumn: 18, level: 1, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</b>"},
				{nLine: 2,  nColumn: 18, level: 1, tagName: "u",       isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_OPEN,       text: "<u>"},
				{nLine: 2,  nColumn: 22, level: 2, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "U"},
				{nLine: 2,  nColumn: 23, level: 1, tagName: "u",       isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</u>"},
				{nLine: 2,  nColumn: 23, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"},
				{nLine: 2,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "\n"},
				{nLine: 2,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n"},
			]
		);
		assertEquals(tokens.map(t => t.normalized()).join(''), `<div><span a="1" b="2">Hello</span></div>\n  <div>A<b>B<u>BU</u></b><u>U</u></div>\n`);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Junk',
	() =>
	{	const source = `<cus-tag>  <!-- COMMENT\n -->  <!HELLO html2>  </junk> .`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<cus-tag"},
				{nLine: 1,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 10, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 1,  nColumn: 12, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!-- COMMENT\n -->"},
				{nLine: 2,  nColumn: 5,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 2,  nColumn: 7,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.DTD,                          text: "<!HELLO html2>"},
				{nLine: 2,  nColumn: 21, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 2,  nColumn: 23, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "</junk>"},
				{nLine: 2,  nColumn: 30, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: " ."},
				{nLine: 2,  nColumn: 30, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " ."},
				{nLine: 2,  nColumn: 32, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</cus-tag>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Junk 2',
	() =>
	{	const source = `<cus-tag\n>  <!-- COMMENT\n\r\n -->  <!HELLO \rhtml2\n>  </junk\n> .`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<cus-tag"},
				{nLine: 1,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 2,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 2,  nColumn: 4,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!-- COMMENT\n\r\n -->"},
				{nLine: 4,  nColumn: 5,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 4,  nColumn: 7,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.DTD,                          text: "<!HELLO \rhtml2\n>"},
				{nLine: 6,  nColumn: 2,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 6,  nColumn: 4,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "</junk\n>"},
				{nLine: 7,  nColumn: 2,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: " ."},
				{nLine: 7,  nColumn: 2,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " ."},
				{nLine: 7,  nColumn: 4,  level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_TAG_CLOSE,      text: "</cus-tag>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Junk 3',
	() =>
	{	const source = `<cus-tag "" a=1 / b=2>.</cus-tag> & <`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<cus-tag"},
				{nLine: 1,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\"\" "},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 15, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "1"},
				{nLine: 1,  nColumn: 16, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 17, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "/ "},
				{nLine: 1,  nColumn: 19, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "b"},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "2"},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 23, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "."},
				{nLine: 1,  nColumn: 24, level: 0, tagName: "cus-tag", isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</cus-tag>"},
				{nLine: 1,  nColumn: 34, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_AMP,                      text: "&"},
				{nLine: 1,  nColumn: 36, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 37, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<"},
				{nLine: 1,  nColumn: 37, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_LT,                       text: "<"},
			]
		);
		assertEquals(tokens.map(t => t.normalized()).join(''), `<cus-tag a=1 b=2>.</cus-tag> &amp; &lt;`);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Junk 4',
	() =>
	{	const source = `<br = a=1 = b='2'>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<br = a=1 = b='2'>"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "= "},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 9,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "1"},
				{nLine: 1,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "= "},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "b"},
				{nLine: 1,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 15, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "'2'"},
				{nLine: 1,  nColumn: 18, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(tokens.map(t => t.normalized()).join(''), `<br a=1 b='2'>`);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Junk 5',
	() =>
	{	const source = `<br => <br ==> <br a=/> <br a=">\n<b a=/></b>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "="},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "=="},
				{nLine: 1,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 16, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 19, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "="},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: "/>"},
				{nLine: 1,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 25, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "=\""},
				{nLine: 1,  nColumn: 32, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 33, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<b"},
				{nLine: 2,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 2,  nColumn: 4,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 2,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "="},
				{nLine: 2,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "/"},
				{nLine: 2,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 2,  nColumn: 8,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</b>"},
				{nLine: 2,  nColumn: 8,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</b>"},
			]
		);
		assertEquals(tokens.map(t => t.normalized()).join(''), `<br > <br > <br a/> <br a>\n<b a></b>`);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Line numbers',
	() =>
	{	const source = `<b v="Aф៘\n😀" A="\r\n" 3\t45\t6\t7=\t8\t9 w="L1\\\n\tL2" B="😀"></b>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<b"},
				{nLine: 1,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "v"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"Aф៘\n😀\""},
				{nLine: 2,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 2,  nColumn: 4,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "A"},
				{nLine: 2,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 2,  nColumn: 6,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"\r\n\""},
				{nLine: 3,  nColumn: 2,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 3,  nColumn: 3,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "3"},
				{nLine: 3,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\t"},
				{nLine: 3,  nColumn: 5,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "45"},
				{nLine: 3,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\t"},
				{nLine: 3,  nColumn: 9,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "6"},
				{nLine: 3,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\t"},
				{nLine: 3,  nColumn: 13, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "7"},
				{nLine: 3,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 3,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\t"},
				{nLine: 3,  nColumn: 17, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "8"},
				{nLine: 3,  nColumn: 18, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "\t"},
				{nLine: 3,  nColumn: 21, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "9"},
				{nLine: 3,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 3,  nColumn: 23, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "w"},
				{nLine: 3,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 3,  nColumn: 25, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"L1\\\n\tL2\""},
				{nLine: 4,  nColumn: 8,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 4,  nColumn: 9,  level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "B"},
				{nLine: 4,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 4,  nColumn: 11, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"😀\""},
				{nLine: 4,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 4,  nColumn: 15, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</b>"},
				{nLine: 4,  nColumn: 15, level: 0, tagName: "b",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</b>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'PI',
	() =>
	{	const source = `A<?B?>C  <<?=NAME?> a="v0<?v1?>v2" a<?=N?>=<?=V?> <?=N2?> <?=N3?>3=''></<?=NAME?> >  &<?ENT1?>E<?ENT2?>; <<?T?>t<?TT?>>*</<?T?>t<?TT?>>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "A"},
				{nLine: 1,  nColumn: 2,  level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.PI,                           text: "<?B?>"},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "C  "},
				{nLine: 1,  nColumn: 10, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<<?=NAME?>"},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a"},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 23, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"v0<?v1?>v2\""},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 36, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a<?=N?>"},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 44, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "<?=V?>"},
				{nLine: 1,  nColumn: 50, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 51, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "<?=N2?>"},
				{nLine: 1,  nColumn: 58, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 59, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "<?=N3?>3"},
				{nLine: 1,  nColumn: 67, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 68, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "''"},
				{nLine: 1,  nColumn: 70, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 71, level: 0, tagName: "<?=NAME?>",isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</<?=NAME?> >"},
				{nLine: 1,  nColumn: 84, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "  "},
				{nLine: 1,  nColumn: 86, level: 0, tagName: "",         isSelfClosing: false, isForeign: false, type: TokenType.ENTITY,                       text: "&<?ENT1?>E<?ENT2?>;"},
				{nLine: 1,  nColumn: 105, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 106, level: 0, tagName: "<?T?>t<?TT?>", isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,          text: "<<?T?>t<?TT?>"},
				{nLine: 1,  nColumn: 119, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 120, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "*"},
				{nLine: 1,  nColumn: 121, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</<?T?>t<?TT?>>"},
				{nLine: 1,  nColumn: 121, level: 0, tagName: "<?T?>t<?TT?>", isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,               text: "</<?T?>t<?TT?>>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Replaceable character data',
	() =>
	{	const source = `<br> <title>Line&1<br>&amp;Line1</title> <br> <textarea cols=2>Line1<br>Line&euro;1</textarea>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "title",   isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<title"},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 13, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line"},
				{nLine: 1,  nColumn: 17, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_AMP,                      text: "&"},
				{nLine: 1,  nColumn: 18, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "1"},
				{nLine: 1,  nColumn: 19, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_LT,                       text: "<"},
				{nLine: 1,  nColumn: 20, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "br>"},
				{nLine: 1,  nColumn: 23, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ENTITY,                       text: "&amp;"},
				{nLine: 1,  nColumn: 28, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line1"},
				{nLine: 1,  nColumn: 33, level: 0, tagName: "title",   isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</title>"},
				{nLine: 1,  nColumn: 41, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 42, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 45, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 46, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 47, level: 0, tagName: "textarea",isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<textarea"},
				{nLine: 1,  nColumn: 56, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 57, level: 0, tagName: "textarea",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "cols"},
				{nLine: 1,  nColumn: 61, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 62, level: 0, tagName: "textarea",isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "2"},
				{nLine: 1,  nColumn: 63, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 64, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line1"},
				{nLine: 1,  nColumn: 69, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.RAW_LT,                       text: "<"},
				{nLine: 1,  nColumn: 70, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "br>Line"},
				{nLine: 1,  nColumn: 77, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ENTITY,                       text: "&euro;"},
				{nLine: 1,  nColumn: 83, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "1"},
				{nLine: 1,  nColumn: 84, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</textarea>"},
				{nLine: 1,  nColumn: 84, level: 0, tagName: "textarea",isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</textarea>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Non-replaceable character data',
	() =>
	{	const source = `<br> <script>Line&1<br>&amp;Line1</script> <br> <style cols=2>Line1<br>Line&euro;1</style>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "script",  isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<script"},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 14, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line&1"},
				{nLine: 1,  nColumn: 20, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "<"},
				{nLine: 1,  nColumn: 21, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "br>&amp;Line1"},
				{nLine: 1,  nColumn: 34, level: 0, tagName: "script",  isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</script>"},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 44, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 47, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 48, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 49, level: 0, tagName: "style",   isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<style"},
				{nLine: 1,  nColumn: 55, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 56, level: 0, tagName: "style",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "cols"},
				{nLine: 1,  nColumn: 60, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 61, level: 0, tagName: "style",   isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "2"},
				{nLine: 1,  nColumn: 62, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 63, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "Line1"},
				{nLine: 1,  nColumn: 68, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "<"},
				{nLine: 1,  nColumn: 69, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "br>Line&euro;1"},
				{nLine: 1,  nColumn: 83, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</style>"},
				{nLine: 1,  nColumn: 83, level: 0, tagName: "style",   isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</style>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Reader',
	async () =>
	{	for (const encoding of ['utf-8', 'utf-16le', 'utf-16be', 'windows-1252'])
		{	for (let chunkSize=1; chunkSize<90; chunkSize++)
			{	for (const isArray of [false, true])
				{	for (const isByob of [false, true])
					{	const chars = encoding=='windows-1252' ? `Abc\nd` : `Aф៘\n😀`;
						const source = stringReader(`<b v="${chars}" A="\r\n" 3\t45\t6\t7=\t8\t9 w="L1\\\n\tL2">${chars}</b>`, isByob, chunkSize, encoding);
						const tokens = [];
						if (!isArray)
						{	for await (const token of htmltokStream(source, {}, [], 4, 1, 1, new TextDecoder(encoding)))
							{	tokens.push(token);
							}
						}
						else
						{	for await (const tt of htmltokStreamArray(source, {}, [], 4, 1, 1, new TextDecoder(encoding)))
							{	for (const token of tt)
								{	tokens.push(token);
								}
							}
						}
						assertEquals
						(	tokens.map(v => Object.assign({} as Any, v)),
							[	{nLine: 1 , nColumn: 1 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,          text: "<b"},
								{nLine: 1 , nColumn: 3 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: " "},
								{nLine: 1 , nColumn: 4 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "v"},
								{nLine: 1 , nColumn: 5 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                 text: "="},
								{nLine: 1 , nColumn: 6 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,              text: `"${chars}"`},
								{nLine: 2 , nColumn: 3 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: " "},
								{nLine: 2 , nColumn: 4 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "A"},
								{nLine: 2 , nColumn: 5 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                 text: "="},
								{nLine: 2 , nColumn: 6 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,              text: "\"\r\n\""},
								{nLine: 3 , nColumn: 2 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: " "},
								{nLine: 3 , nColumn: 3 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "3"},
								{nLine: 3 , nColumn: 4 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: "\t"},
								{nLine: 3 , nColumn: 5 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "45"},
								{nLine: 3 , nColumn: 7 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: "\t"},
								{nLine: 3 , nColumn: 9 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "6"},
								{nLine: 3 , nColumn: 10, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: "\t"},
								{nLine: 3 , nColumn: 13, level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "7"},
								{nLine: 3 , nColumn: 14, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                 text: "="},
								{nLine: 3 , nColumn: 15, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: "\t"},
								{nLine: 3 , nColumn: 17, level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,              text: "8"},
								{nLine: 3 , nColumn: 18, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: "\t"},
								{nLine: 3 , nColumn: 21, level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "9"},
								{nLine: 3 , nColumn: 22, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,          text: " "},
								{nLine: 3 , nColumn: 23, level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,               text: "w"},
								{nLine: 3 , nColumn: 24, level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                 text: "="},
								{nLine: 3 , nColumn: 25, level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,              text: "\"L1\\\n\tL2\""},
								{nLine: 4 , nColumn: 8 , level: 0, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,            text: ">"},
								{nLine: 4 , nColumn: 9 , level: 1, tagName: "",       isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                    text: chars},
								{nLine: 5 , nColumn: 2 , level: 0, tagName: "b",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,               text: "</b>"},
							]
						);
					}
				}
			}
		}
	}
);

Deno.test
(	'Foreign',
	() =>
	{	const source = `<q><svg> <path d=hello/> </svg></q>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<q"},
				{nLine: 1,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 4,  level: 1, tagName: "svg",     isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_BEGIN,               text: "<svg"},
				{nLine: 1,  nColumn: 8,  level: 1, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 9,  level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 10, level: 2, tagName: "path",    isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_BEGIN,               text: "<path"},
				{nLine: 1,  nColumn: 15, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 16, level: 2, tagName: "path",    isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_NAME,                    text: "d"},
				{nLine: 1,  nColumn: 17, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 18, level: 2, tagName: "path",    isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_VALUE,                   text: "hello"},
				{nLine: 1,  nColumn: 23, level: 2, tagName: "",        isSelfClosing: true,  isForeign: true,  type: TokenType.TAG_OPEN_END,                 text: "/>"},
				{nLine: 1,  nColumn: 25, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 26, level: 1, tagName: "svg",     isSelfClosing: false, isForeign: true,  type: TokenType.TAG_CLOSE,                    text: "</svg>"},
				{nLine: 1,  nColumn: 32, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</q>"},
				{nLine: 1,  nColumn: 32, level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</q>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Foreign 2',
	() =>
	{	const source = `<q><svg width=100/> </svg></q>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<q"},
				{nLine: 1,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 4,  level: 1, tagName: "svg",     isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_BEGIN,               text: "<svg"},
				{nLine: 1,  nColumn: 8,  level: 1, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 9,  level: 1, tagName: "svg",     isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_NAME,                    text: "width"},
				{nLine: 1,  nColumn: 14, level: 1, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 15, level: 1, tagName: "svg",     isSelfClosing: false, isForeign: true,  type: TokenType.ATTR_VALUE,                   text: "100"},
				{nLine: 1,  nColumn: 18, level: 1, tagName: "",        isSelfClosing: true,  isForeign: true,  type: TokenType.TAG_OPEN_END,                 text: "/>"},
				{nLine: 1,  nColumn: 20, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 21, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "</svg>"},
				{nLine: 1,  nColumn: 27, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</q>"},
				{nLine: 1,  nColumn: 27, level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</q>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Comments',
	() =>
	{	const source = `<!----><!-----><!-- ------------------------- --><!-- -> -> --><!-- <?-->?> -->`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!---->"},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!----->"},
				{nLine: 1,  nColumn: 16, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!-- ------------------------- -->"},
				{nLine: 1,  nColumn: 50, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!-- -> -> -->"},
				{nLine: 1,  nColumn: 64, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<!-- <?-->?> -->"},
				{nLine: 1,  nColumn: 64, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.COMMENT,                      text: "<!-- <?-->?> -->"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'CDATA',
	() =>
	{	const source = `<![CDATA[]]><![CDATA[[[]]><![CDATA[ ]] ]]><![CDATA[ [[ ]]><![CDATA[ <?]]>?> ]]>`;
		const tokens = [...htmltok(source, {mode: 'xml'})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[]]>"},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[[[]]>"},
				{nLine: 1,  nColumn: 27, level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[ ]] ]]>"},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[ [[ ]]>"},
				{nLine: 1,  nColumn: 59, level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.MORE_REQUEST,                 text: "<![CDATA[ <?]]>?> ]]>"},
				{nLine: 1,  nColumn: 59, level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[ <?]]>?> ]]>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'CDATA 2',
	() =>
	{	const source = `<q> <![CDATA[junk]]> <math> <![CDATA[text]]> </math> </q>`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<q"},
				{nLine: 1,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 4,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 5,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "<![CDATA[junk]]>"},
				{nLine: 1,  nColumn: 21, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 22, level: 1, tagName: "math",    isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_BEGIN,               text: "<math"},
				{nLine: 1,  nColumn: 27, level: 1, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 1,  nColumn: 28, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 29, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.CDATA,                        text: "<![CDATA[text]]>"},
				{nLine: 1,  nColumn: 45, level: 2, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 46, level: 1, tagName: "math",    isSelfClosing: false, isForeign: true,  type: TokenType.TAG_CLOSE,                    text: "</math>"},
				{nLine: 1,  nColumn: 53, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: " "},
				{nLine: 1,  nColumn: 54, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</q>"},
				{nLine: 1,  nColumn: 54, level: 0, tagName: "q",       isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</q>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Duplicate attribute names',
	() =>
	{	const source = `<br a1=yes a2="yes"  a1="no" a2=no A2="no">`;
		const tokens = [...htmltok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<br a1=yes a2=\"yes\"  a1=\"no\" a2=no A2=\"no\">"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a1"},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "yes"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a2"},
				{nLine: 1,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 15, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"yes\""},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "  "},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK_DUP_ATTR_NAME,           text: "a1"},
				{nLine: 1,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "=\"no\""},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK_DUP_ATTR_NAME,           text: "a2"},
				{nLine: 1,  nColumn: 32, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "=no"},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 36, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK_DUP_ATTR_NAME,           text: "A2"},
				{nLine: 1,  nColumn: 38, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "=\"no\""},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'No check duplicate attribute names',
	() =>
	{	const source = `<br a1=yes a2="yes"  a1="no" a2=no A2="no">`;
		const tokens = [...htmltok(source, {noCheckAttributes: true})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<br a1=yes a2=\"yes\"  a1=\"no\" a2=no A2=\"no\">"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<br"},
				{nLine: 1,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 5,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a1"},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 8,  level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "yes"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a2"},
				{nLine: 1,  nColumn: 14, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 15, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"yes\""},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: "  "},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a1"},
				{nLine: 1,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 25, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"no\""},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "a2"},
				{nLine: 1,  nColumn: 32, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 33, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "no"},
				{nLine: 1,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 36, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "A2"},
				{nLine: 1,  nColumn: 38, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 39, level: 0, tagName: "br",      isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"no\""},
				{nLine: 1,  nColumn: 43, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'DTD',
	() =>
	{	const source = normalizeIndent
		(	`	<!DOCTYPE address [
					<!ELEMENT address (name,company,phone)>
					<!ELEMENT name (#PCDATA)>
					<!ELEMENT company (#PCDATA)>
					<!ELEMENT phone (#PCDATA)>
				]>
				<address/>
			`
		);
		const tokens = [...htmltok(source, {mode: 'xml'})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.DTD,                          text: "<!DOCTYPE address [\n\t<!ELEMENT address (name,company,phone)>\n\t<!ELEMENT name (#PCDATA)>\n\t<!ELEMENT company (#PCDATA)>\n\t<!ELEMENT phone (#PCDATA)>\n]>"},
				{nLine: 6,  nColumn: 3,  level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.TEXT,                         text: "\n"},
				{nLine: 7,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: true,  type: TokenType.MORE_REQUEST,                 text: "<address/>"},
				{nLine: 7,  nColumn: 1,  level: 0, tagName: "address", isSelfClosing: false, isForeign: true,  type: TokenType.TAG_OPEN_BEGIN,               text: "<address"},
				{nLine: 7,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: true,  isForeign: true,  type: TokenType.TAG_OPEN_END,                 text: "/>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'DTD2',
	() =>
	{	const source = normalizeIndent
		(	`	<![ %HTML.Frameset; [
					<!ENTITY % MultiLengths "CDATA" -- comma-separated list of MultiLength -->
				]]>
				<html></html>
			`
		);
		const tokens = [...htmltok(source, {mode: 'html'})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "<![ %HTML.Frameset; [\n\t<!ENTITY % MultiLengths \"CDATA\" -- comma-separated list of MultiLength -->\n]]>"},
				{nLine: 3,  nColumn: 4,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n"},
				{nLine: 4,  nColumn: 1,  level: 0, tagName: "html",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<html"},
				{nLine: 4,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				{nLine: 4,  nColumn: 7,  level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "</html>"},
				{nLine: 4,  nColumn: 7,  level: 0, tagName: "html",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</html>"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Unquote attributes',
	() =>
	{	for (const c of [' ', '\f', '=', '<', '>', '&', "'", '`'])
		{	const source = `<meta name="viewport" content="char${c}">`;
			const tokens = [...htmltok(source, {unquoteAttributes: true})];
			assertEquals(tokens.join(''), source);
			assertEquals
			(	tokens.map(v => Object.assign({} as Any, v)),
				[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: `<meta name="viewport" content="char${c}">`},
					{nLine: 1,  nColumn: 1,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
					{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
					{nLine: 1,  nColumn: 7,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
					{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
					{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
					{nLine: 1,  nColumn: 13, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
					{nLine: 1,  nColumn: 21, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
					{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
					{nLine: 1,  nColumn: 23, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
					{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
					{nLine: 1,  nColumn: 31, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: `"char${c}"`},
					{nLine: 1,  nColumn: 38, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				]
			);
			assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
		}

		for (const c of ['\r', '\n'])
		{	const source = `<meta name="viewport" content="char${c}">`;
			const tokens = [...htmltok(source, {unquoteAttributes: true})];
			assertEquals(tokens.join(''), source);
			assertEquals
			(	tokens.map(v => Object.assign({} as Any, v)),
				[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: `<meta name="viewport" content="char${c}">`},
					{nLine: 1,  nColumn: 1,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
					{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
					{nLine: 1,  nColumn: 7,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
					{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
					{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
					{nLine: 1,  nColumn: 13, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
					{nLine: 1,  nColumn: 21, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
					{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
					{nLine: 1,  nColumn: 23, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
					{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
					{nLine: 1,  nColumn: 31, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: `"char${c}"`},
					{nLine: 2,  nColumn: 2,  level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
				]
			);
			assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
		}

		let source = `<meta name="viewport" content='char"'>`;
		let tokens = [...htmltok(source, {unquoteAttributes: true})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<meta name=\"viewport\" content='char\"'>"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 23, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 31, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "'char\"'"},
				{nLine: 1,  nColumn: 38, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));

		source = `<meta name="viewport" content="char\t">`;
		tokens = [...htmltok(source, {unquoteAttributes: true})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<meta name=\"viewport\" content=\"char\t\">"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
				{nLine: 1,  nColumn: 13, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.JUNK,                         text: "\""},
				{nLine: 1,  nColumn: 22, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 23, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
				{nLine: 1,  nColumn: 30, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 31, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"char\t\""},
				{nLine: 1,  nColumn: 38, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Quote attributes',
	() =>
	{	const source = `<meta name=viewport content=width=device-width,initial-scale=1.0>`;
		const tokens = [...htmltok(source, {quoteAttributes: true})];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign({} as Any, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "<meta name=viewport content=width=device-width,initial-scale=1.0>"},
				{nLine: 1,  nColumn: 1,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
				{nLine: 1,  nColumn: 6,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 7,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
				{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_ATTR_QUOT,      text: "\""},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
				{nLine: 1,  nColumn: 12, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_ATTR_QUOT,      text: "\""},
				{nLine: 1,  nColumn: 20, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
				{nLine: 1,  nColumn: 21, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
				{nLine: 1,  nColumn: 28, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_ATTR_QUOT,      text: "\""},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "width=device-width,initial-scale=1.0"},
				{nLine: 1,  nColumn: 29, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.FIX_STRUCTURE_ATTR_QUOT,      text: "\""},
				{nLine: 1,  nColumn: 65, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({} as Any, v)));
	}
);

Deno.test
(	'Token value',
	() =>
	{	let token = [...htmltok(`Text &apos; text`)][1];
		assertEquals(token.getValue(), "'");

		token = [...htmltok(`Text &apos; text`)][0];
		assertEquals(token.getValue(), "Text ");

		token = [...htmltok(`Text & text`)][1];
		assertEquals(token.getValue(), "&");

		token = [...htmltok(`Text < text`)][1];
		assertEquals(token.getValue(), "<");

		token = [...htmltok(`<Svg><![CDATA[HELLO &apos;]]></Svg>`)][2];
		assertEquals(token.getValue(), "HELLO &apos;");

		token = [...htmltok(`<Svg><![CDATA[HELLO &apos;]]></Svg>`)][0];
		assertEquals(token.getValue(), "svg");

		token = [...htmltok(`<!--HELLO &apos;--> `)][0];
		assertEquals(token.getValue(), "HELLO &apos;");

		token = [...htmltok(`<?HELLO &apos;?> `)][0];
		assertEquals(token.getValue(), "HELLO &apos;");

		token = [...htmltok(`<div title=a&amp;b>text</div>`)][4];
		assertEquals(token.getValue(), "a&b");

		token = [...htmltok(`<div title="a&amp;b">text</div>`)][4];
		assertEquals(token.getValue(), "a&b");

		token = [...htmltok(`<div title='a&amp;b'>text</div>`)][4];
		assertEquals(token.getValue(), "a&b");
	}
);
