import {htmlDecode} from './entities.ts';

const DEFAULT_MAX_TOKEN_LENGTH = 16*1024;

const TAGS_VOID = new Set(['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr']);
const TAGS_NON_STRUCTURE = new Set(['b', 'strong', 'i', 'u', 's', 'strike', 'small', 'big', 'nobr']);

const STR_PP = String.raw `<\?  .*?  (?:$ | \?>)`;
const STR_DTD = String.raw `(?:    "(?:<\?.*?\?> | [^"])*"  |  '(?:<\?.*?\?> | [^'])*'  |  <\?.*?\?>  |  -- (?:(?:<\?.*?\?> | [^-])* -(?!-))* (?:<\?.*?\?> | [^-])* --  |  \[ (?:<\?.*?\?> | [^\]])* \]  |  [^>]    )*`;
const STR_ENTITY = String.raw `&  #?  (?:[a-z0-9] | <\?.*?\?>){1,32}  (?:$ | ;)`;

const RE_TOKENIZER_TEXT = new RegExp
(	String.raw
	`	<\?  |
		<!-  (?:$ | -)  |
		<!\[  (?:$|C)  (?:$|D)  (?:$|A)  (?:$|T)  (?:$|A)  (?:$|\[)  |
		<!  ${STR_DTD}  (?:$ | >)  |
		</ (?:  $  |  (     (?:[\w\-:] | <\?.*?\?>)+     )  )  \s*  (?:$ | >)  |
		<  (?:[\w\-:] | <\?.*?\?>)+  |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_COMMENT = new RegExp
(	String.raw
	`	-  (?:$ | -)  (?:$ | >)  |
		<\?  |
		(?:.(?!-->|<\?))+ .  |
		.
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_CDATA = new RegExp
(	String.raw
	`	\]  (?:$ | \])  (?:$ | >)  |
		<\?  |
		(?:.(?!\]\]>|<\?))+ .  |
		.
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_PI = new RegExp
(	String.raw
	`	\?  (?:$ | >)  |
		[^\?>]+  |
		\?  |
		>
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_TAG = new RegExp
(	String.raw
	`	\s+  |
		(?:<\?.*?\?> | [^\s="'/>])+  |
		/?>  |
		[="'/]+
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_ATTR_VALUE = new RegExp
(	String.raw
	`	\s+  |
		(?:<\?.*?\?> | [^\s="'/>])+  |
		=  \s*  (?:<\?.*?\?> | [^\s"'/>])+  |
		=  \s*  " (?:<\?.*?\?> | [^"])* (?:$ | ")  |
		=  \s*  ' (?:<\?.*?\?> | [^'])* (?:$ | ')  |
		/?>  |
		=  \s*  |
		["'/]  [="'/]*
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_TITLE = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(title) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_TEXTAREA = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(textarea) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_SCRIPT = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(script) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		[^<]+  |
		<
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_STYLE = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(style) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		[^<]+  |
		<
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_SPACE = /\s+/y;
const RE_CAN_UNQUOTE = /[^\s"'`=<>&]*/y;
const RE_PP = /<\?.*?\?>/g;

const C_AMP = '&'.charCodeAt(0);
const C_LT = '<'.charCodeAt(0);
const C_GT = '>'.charCodeAt(0);
const C_QEST = '?'.charCodeAt(0);
const C_EXCL = '!'.charCodeAt(0);
const C_SLASH = '/'.charCodeAt(0);
const C_MINUS = '-'.charCodeAt(0);
const C_EQ = '='.charCodeAt(0);
const C_DASH = '-'.charCodeAt(0);
const C_QUOT = '"'.charCodeAt(0);
const C_APOS = "'".charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_SEMICOLON = ';'.charCodeAt(0);
const C_SQUARE_OPEN = '['.charCodeAt(0);
const C_SQUARE_CLOSE = ']'.charCodeAt(0);

const PADDER = '                                ';

export interface Settings
{	/**	Tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies {@link Settings.quoteAttributes}.
	 **/
	mode?: 'html' | 'xml';

	/**	If `true`, will not try to determine duplicate attribute names. This can save some computing resources.
	 **/
	noCheckAttributes?: boolean;

	/**	If `true`, will generate {@link TokenType.FIX_STRUCTURE_ATTR_QUOT} tokens to suggest quotes around unquoted attribute values.
	 **/
	quoteAttributes?: boolean;

	/**	If `true`, will return quotes around attribute values as {@link TokenType.JUNK}, if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.
	 **/
	unquoteAttributes?: boolean;

	/**	If single unsplittable token exceeds this length, an exception will be thrown.
		However this check is only performed before issuing {@link TokenType.MORE_REQUEST} (so tokens can be longer as long as there's enough space in the buffer).
		Some tokens are splittable (are returned by parts), like comments, CDATA sections, and text, so this setting doesn't apply to them.
		Unsplitable tokens include: attribute names, attribute values and DTD.

		@default 16384 characters
	 **/
	maxTokenLength?: number;
}

const enum QuoteAttributesMode
{	INTACT,
	QUOTE,
	UNQUOTE,
}

const enum State
{	/**	Assume: re is RE_TOKENIZER_TEXT, RE_TOKENIZER_TITLE, RE_TOKENIZER_TEXTAREA, RE_TOKENIZER_SCRIPT or RE_TOKENIZER_STYLE.
	 **/
	TEXT,

	/**	Assume: re is RE_TOKENIZER_COMMENT.
	 **/
	COMMENT,

	/**	Assume: re is RE_TOKENIZER_CDATA.
	 **/
	CDATA,

	/**	CDATA in HTML, not XML.
		Assume: re is RE_TOKENIZER_CDATA.
	 **/
	CDATA_JUNK,

	/**	Assume: re is RE_TOKENIZER_PI.
	 **/
	PI,

	/**	Preprocessing instruction inside comment.
		Assume: re is RE_TOKENIZER_PI.
	 **/
	COMMENT_PI,

	/**	Preprocessing instruction inside CDATA.
		Assume: re is RE_TOKENIZER_PI.
	 **/
	CDATA_PI,

	CDATA_JUNK_PI,

	/**	`<div`
		Assume: re is RE_TOKENIZER_TAG.
	 **/
	TAG_OPENED,

	/**	After space, like: `<div ` or `<div autofocus ` or `<div id=main `
		Assume: re is RE_TOKENIZER_TAG.
	 **/
	BEFORE_ATTR_NAME,

	/**	`<div id`
		Assume: re is RE_TOKENIZER_ATTR_VALUE.
	 **/
	AFTER_NAME,

	/**	The same as {@link State.AFTER_NAME}, but duplicate attribute name, that was returned as {@link TokenType.JUNK}.
		Assume: re is RE_TOKENIZER_ATTR_VALUE.
	 **/
	AFTER_DUP_NAME,
}

export const enum TokenType
{	/**	Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.
	 **/
	TEXT,

	/**	One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's {@link Token.text}, like `&a<?...?>o<?...?>;`.
	 **/
	ENTITY,

	/**	The beginning of preprocessing instruction, i.e. `<?`.

		After this token, 0 or more parts will be returned as {@link TokenType.PI_MID}.
		Finally, the last part will be returned as {@link TokenType.PI_END} with the value of `?>`.
	 **/
	PI_BEGIN,

	/**	Text inside preprocessing instruction.
		See {@link TokenType.PI_BEGIN}.
	 **/
	PI_MID,

	/**	Preprocessing instruction end (`?>`).
		See {@link TokenType.PI_BEGIN}.
	 **/
	PI_END,

	/**	The beginning of HTML comment, i.e. `<!--`.

		After this token, 0 or more parts will be returned as {@link TokenType.COMMENT_MID} or {@link TokenType.COMMENT_MID_PI}.
		{@link TokenType.COMMENT_MID_PI} means a preprocessing instruction inside the comment.
		Finally, the last part will be returned as {@link TokenType.COMMENT_END} with the value of `-->`.
	 **/
	COMMENT_BEGIN,

	/**	Text inside comment.
		See {@link TokenType.COMMENT_BEGIN}.
	 **/
	COMMENT_MID,

	/**	If the comment contains preprocessing instructions, they are returned as this token type.
		See {@link TokenType.COMMENT_BEGIN}.
	 **/
	COMMENT_MID_PI,

	/**	Comment end (`-->`).
		See {@link TokenType.COMMENT_BEGIN}.
	 **/
	COMMENT_END,

	/**	The beginning of CDATA block, i.e. `<![CDATA[`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode.
		In other places `<![CDATA[` is returned as {@link TokenType.JUNK}.

		After this token, 0 or more parts will be returned as {@link TokenType.CDATA_MID} or {@link TokenType.CDATA_MID_PI}.
		{@link TokenType.CDATA_MID_PI} means a preprocessing instruction inside the CDATA.
		Finally, the last part will be returned as {@link TokenType.CDATA_END} with the value of `]]>`.
	 **/
	CDATA_BEGIN,

	/**	Text inside CDATA.
		See {@link TokenType.CDATA_BEGIN}.
	 **/
	CDATA_MID,

	/**	If the CDATA section contains preprocessing instructions, they are returned as this token type.
		See {@link TokenType.CDATA_BEGIN}.
	 **/
	CDATA_MID_PI,

	/**	CDATA section end (`]]>`).
		See {@link TokenType.CDATA_BEGIN}.
	 **/
	CDATA_END,

	/**	Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.
	 **/
	DTD,

	/**	`<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. {@link Token.tagName} contains lowercased (if not XML and there're no preprocessing instructions) tag name.
	 **/
	TAG_OPEN_BEGIN,

	/**	Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.
	 **/
	TAG_OPEN_SPACE,

	/**	Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`. `Token.getValue()` returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
	 **/
	ATTR_NAME,

	/**	`=` char after attribute name. It's always followed by {@link TokenType.ATTR_VALUE} (optionally preceded by {@link TokenType.TAG_OPEN_SPACE}). If `=` is not followed by attribute value, it's returned as {@link TokenType.JUNK}.
	 **/
	ATTR_EQ,

	/**	Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. {@link Token.getValue()} returns unquoted text with decoded entities, but preprocessing instructions are left intact.
	 **/
	ATTR_VALUE,

	/**	`>` or `/>` chars that terminate opening tag. {@link Token.isSelfClosing} indicates whether this tag doesn't have corresponding closing tag.
	 **/
	TAG_OPEN_END,

	/**	Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.
	 **/
	TAG_CLOSE,

	/**	`<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.
	 **/
	RAW_LT,

	/**	`&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.
	 **/
	RAW_AMP,

	/**	Characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:

		- Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
		- Unnecessary quotes around attribute value, if requested to unquote attributes.
		- Attribute values of duplicate attributes.
		- Closing tag, that was not opened.
		- CDATA not in XML or foreign tags.
	 **/
	JUNK,

	/**	Name of duplicate attribute.
	 **/
	JUNK_DUP_ATTR_NAME,

	/**	`FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as {@link TokenType.FIX_STRUCTURE_TAG_CLOSE}, and `<u>` as {@link TokenType.FIX_STRUCTURE_TAG_OPEN}.
	 **/
	FIX_STRUCTURE_TAG_OPEN,

	/**	One space character that is suggested between attributes in situations like `<meta name="name"content="content">`.
	 **/
	FIX_STRUCTURE_TAG_OPEN_SPACE,

	/**	Automatically inserted `>` character at the end of stream, if there is opening tag not closed.
		Then 0 or more {@link TokenType.FIX_STRUCTURE_TAG_CLOSE} tokens can be generated to close all unclosed tags.
	 **/
	FIX_STRUCTURE_TAG_OPEN_END,

	/**	Autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.
	 **/
	FIX_STRUCTURE_TAG_CLOSE,

	/**	One autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.
	 **/
	FIX_STRUCTURE_ATTR_QUOT,

	/**	If there was {@link TokenType.PI_BEGIN} generated, but then end of stream reached without terminating {@link TokenType.PI_END},
		will generate this fix token with the value of `?>`.
		Also will generate it if a preprocessing instruction was opened and not closed inside a comment ({@link TokenType.COMMENT_MID_PI}) or a CDATA section ({@link TokenType.CDATA_MID_PI}).
	 **/
	FIX_STRUCTURE_PI_END,

	/**	If there was {@link TokenType.COMMENT_BEGIN} generated, but then end of stream reached without terminating {@link TokenType.COMMENT_END},
		will generate this fix token with the value of `-->`.
	 **/
	FIX_STRUCTURE_COMMENT_END,

	/**	If there was {@link TokenType.CDATA_BEGIN} generated, but then end of stream reached without terminating {@link TokenType.CDATA_END},
		will generate this fix token with the value of `]]>`.
	 **/
	FIX_STRUCTURE_CDATA_END,

	/**	Before returning the last token found in the source string, {@link htmltok()} generates this meta-token.
		If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
	 **/
	MORE_REQUEST,
}

export class Token
{	constructor
	(	public text: string,
		public type: TokenType,
		public nLine = 1,
		public nColumn = 1,
		public level = 0,
		public tagName = '',
		public isSelfClosing = false,
		public isForeign = false,
	){}

	toString()
	{	return this.type>=TokenType.FIX_STRUCTURE_TAG_OPEN ? '' : this.text;
	}

	normalized()
	{	return this.type==TokenType.JUNK || this.type==TokenType.JUNK_DUP_ATTR_NAME || this.type==TokenType.MORE_REQUEST ? '' : this.type==TokenType.RAW_LT ? '&lt;' : this.type==TokenType.RAW_AMP ? '&amp;' : this.text;
	}

	debug()
	{	let type = '';
		switch (this.type)
		{	case TokenType.TEXT:                         type = 'TokenType.TEXT,                        '; break;
			case TokenType.ENTITY:                       type = 'TokenType.ENTITY,                      '; break;
			case TokenType.PI_BEGIN:                     type = 'TokenType.PI_BEGIN,                    '; break;
			case TokenType.PI_MID:                       type = 'TokenType.PI_MID,                      '; break;
			case TokenType.PI_END:                       type = 'TokenType.PI_END,                      '; break;
			case TokenType.COMMENT_BEGIN:                type = 'TokenType.COMMENT_BEGIN,               '; break;
			case TokenType.COMMENT_MID:                  type = 'TokenType.COMMENT_MID,                 '; break;
			case TokenType.COMMENT_MID_PI:               type = 'TokenType.COMMENT_MID_PI,              '; break;
			case TokenType.COMMENT_END:                  type = 'TokenType.COMMENT_END,                 '; break;
			case TokenType.CDATA_BEGIN:                  type = 'TokenType.CDATA_BEGIN,                 '; break;
			case TokenType.CDATA_MID:                    type = 'TokenType.CDATA_MID,                   '; break;
			case TokenType.CDATA_MID_PI:                 type = 'TokenType.CDATA_MID_PI,                '; break;
			case TokenType.CDATA_END:                    type = 'TokenType.CDATA_END,                   '; break;
			case TokenType.DTD:                          type = 'TokenType.DTD,                         '; break;
			case TokenType.TAG_OPEN_BEGIN:               type = 'TokenType.TAG_OPEN_BEGIN,              '; break;
			case TokenType.TAG_OPEN_SPACE:               type = 'TokenType.TAG_OPEN_SPACE,              '; break;
			case TokenType.ATTR_NAME:                    type = 'TokenType.ATTR_NAME,                   '; break;
			case TokenType.ATTR_EQ:                      type = 'TokenType.ATTR_EQ,                     '; break;
			case TokenType.ATTR_VALUE:                   type = 'TokenType.ATTR_VALUE,                  '; break;
			case TokenType.TAG_OPEN_END:                 type = 'TokenType.TAG_OPEN_END,                '; break;
			case TokenType.TAG_CLOSE:                    type = 'TokenType.TAG_CLOSE,                   '; break;
			case TokenType.RAW_LT:                       type = 'TokenType.RAW_LT,                      '; break;
			case TokenType.RAW_AMP:                      type = 'TokenType.RAW_AMP,                     '; break;
			case TokenType.JUNK:                         type = 'TokenType.JUNK,                        '; break;
			case TokenType.JUNK_DUP_ATTR_NAME:           type = 'TokenType.JUNK_DUP_ATTR_NAME,          '; break;
			case TokenType.FIX_STRUCTURE_TAG_OPEN:       type = 'TokenType.FIX_STRUCTURE_TAG_OPEN,      '; break;
			case TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE: type = 'TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE,'; break;
			case TokenType.FIX_STRUCTURE_TAG_OPEN_END:   type = 'TokenType.FIX_STRUCTURE_TAG_OPEN_END,  '; break;
			case TokenType.FIX_STRUCTURE_TAG_CLOSE:      type = 'TokenType.FIX_STRUCTURE_TAG_CLOSE,     '; break;
			case TokenType.FIX_STRUCTURE_ATTR_QUOT:      type = 'TokenType.FIX_STRUCTURE_ATTR_QUOT,     '; break;
			case TokenType.FIX_STRUCTURE_PI_END:         type = 'TokenType.FIX_STRUCTURE_PI_END,        '; break;
			case TokenType.FIX_STRUCTURE_COMMENT_END:    type = 'TokenType.FIX_STRUCTURE_COMMENT_END,   '; break;
			case TokenType.FIX_STRUCTURE_CDATA_END:      type = 'TokenType.FIX_STRUCTURE_CDATA_END,     '; break;
			case TokenType.MORE_REQUEST:                 type = 'TokenType.MORE_REQUEST,                '; break;
		}
		return `{nLine: ${pad(this.nLine+',', 3)} nColumn: ${pad(this.nColumn+',', 3)} level: ${this.level}, tagName: ${pad(JSON.stringify(this.tagName)+',', 10)} isSelfClosing: ${this.isSelfClosing ? 'true, ' : 'false,'} isForeign: ${this.isForeign ? 'true, ' : 'false,'} type: ${type} text: ${JSON.stringify(this.text)}}`;
	}

	getValue()
	{	const {type, text} = this;
		switch (type)
		{	case TokenType.ENTITY:
				return htmlDecode(text);
			case TokenType.TAG_OPEN_BEGIN:
			case TokenType.FIX_STRUCTURE_TAG_OPEN:
			case TokenType.TAG_CLOSE:
			case TokenType.FIX_STRUCTURE_TAG_CLOSE:
				return this.tagName;
			case TokenType.ATTR_NAME:
				return this.isForeign || text.indexOf('>')!=-1 ? text : text.toLowerCase(); // lowercase if not XML, and doesn't contain preprocessing instructions
			case TokenType.ATTR_VALUE:
				return htmlDecode(text.charCodeAt(0)==C_QUOT || text.charCodeAt(0)==C_APOS ? text.slice(1, -1) : text, true);
			case TokenType.RAW_LT:
				return '<';
			case TokenType.RAW_AMP:
				return '&';
			case TokenType.JUNK:
			case TokenType.JUNK_DUP_ATTR_NAME:
			case TokenType.MORE_REQUEST:
				return '';
			default:
				return text;
		}
	}
}

function pad(str: string, width: number)
{	return str + PADDER.substring(0, width-str.length);
}

export function *htmltok(source: string, settings: Settings={}, hierarchy=new Array<string>, tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|undefined>
{	function countLines(text: string, from: number, to: number)
	{	while (from < to)
		{	const c = text.charCodeAt(from++);
			if (c == C_CR)
			{	nLine++;
				nColumn = 1;
				if (text.charCodeAt(from) == C_LF)
				{	from++;
				}
			}
			else if (c == C_LF)
			{	nLine++;
				nColumn = 1;
			}
			else if (c == C_TAB)
			{	nColumn += tabWidth - (nColumn-1)%tabWidth;
			}
			else if (!(c>=0xDC00 && c<=0xDFFF)) // if not a second byte of a surrogate pair
			{	nColumn++;
			}
		}
	}

	const quoteAttributesMode = settings.mode==='xml' || settings.quoteAttributes ? QuoteAttributesMode.QUOTE : settings.unquoteAttributes ? QuoteAttributesMode.UNQUOTE : QuoteAttributesMode.INTACT;
	const curAttrs = settings.noCheckAttributes ? undefined : new Set<string>;
	const maxTokenLength = settings.maxTokenLength || DEFAULT_MAX_TOKEN_LENGTH;
	let foreignLevel = settings.mode==='xml' ? -2 : -1; // -1 means not a foreign (xml) tag; otherwise `foreignLevel` must be set back to -1 when `hierarchy.length` reaches `foreignLevel`; -2 means will never reach
	let state = State.TEXT;
	let re = RE_TOKENIZER_TEXT;
	let lastIndex = 0;
	let match;
	let tagName = '';

L:	while (true)
	{	re.lastIndex = lastIndex;
		if (!(match = re.exec(source)))
		{	break;
		}
		lastIndex = re.lastIndex;
		const text = match[0];

		// Is last token?
		if (lastIndex == source.length)
		{	if (text.length >= maxTokenLength)
			{	throw new Error(`Token exceeds the maximum length of ${maxTokenLength} characters: ${text.slice(0, 100)}...`);
			}

			// MORE_REQUEST?
			const more = yield new Token(text, TokenType.MORE_REQUEST, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			if (typeof(more)=='string' && more.length)
			{	lastIndex = 0;
				source = text + more;
				continue;
			}

			// Last token can be incomplete
			switch (state)
			{	case State.AFTER_NAME:
				{	RE_SPACE.lastIndex = 1;
					const firstAttrChar = RE_SPACE.test(text) ? RE_SPACE.lastIndex : 1;
					const qt = text.charCodeAt(firstAttrChar);
					if (qt==C_QUOT || qt==C_APOS)
					{	if (text.charCodeAt(text.length-1) != qt)
						{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
							countLines(text, 0, text.length);
							break L;
						}
					}
					break;
				}
				case State.TEXT:
				{	if (text.charCodeAt(0) == C_AMP)
					{	const textNoPp = text.replace(RE_PP, '');
						if (textNoPp.charCodeAt(textNoPp.length-1) != C_SEMICOLON)
						{	yield new Token('&', TokenType.RAW_AMP, nLine, nColumn++, hierarchy.length, '', false, foreignLevel!=-1);
							lastIndex -= text.length - 1;
							continue;
						}
					}
					else if (text.charCodeAt(0) == C_LT)
					{	if (text.charCodeAt(1) == C_EXCL)
						{	if (text!='<!--' && text!='<![CDATA[')
							{	yield new Token('<', re==RE_TOKENIZER_SCRIPT || re==RE_TOKENIZER_STYLE ? TokenType.TEXT : TokenType.RAW_LT, nLine, nColumn++, hierarchy.length, '', false, foreignLevel!=-1);
								lastIndex -= text.length - 1;
								continue;
							}
						}
						else
						{	const textNoPp = text.replace(RE_PP, '');
							if (textNoPp.charCodeAt(textNoPp.length-1) != C_GT)
							{	yield new Token('<', re==RE_TOKENIZER_SCRIPT || re==RE_TOKENIZER_STYLE ? TokenType.TEXT : TokenType.RAW_LT, nLine, nColumn++, hierarchy.length, '', false, foreignLevel!=-1);
								lastIndex -= text.length - 1;
								continue;
							}
						}
					}
				}
			}
		}

		switch (state)
		{	case State.COMMENT:
			{	if (text == '-->')
				{	yield new Token(text, TokenType.COMMENT_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 3;
					state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
				}
				else if (text == '<?')
				{	yield new Token(text, TokenType.COMMENT_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.COMMENT_PI;
					re = RE_TOKENIZER_PI;
				}
				else
				{	yield new Token(text, TokenType.COMMENT_MID, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.CDATA:
			{	if (text == ']]>')
				{	yield new Token(text, TokenType.CDATA_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 3;
					state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
				}
				else if (text == '<?')
				{	yield new Token(text, TokenType.CDATA_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.CDATA_PI;
					re = RE_TOKENIZER_PI;
				}
				else
				{	yield new Token(text, TokenType.CDATA_MID, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.CDATA_JUNK:
			{	if (text == ']]>')
				{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 3;
					state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
				}
				else if (text == '<?')
				{	yield new Token(text, TokenType.PI_BEGIN, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.CDATA_JUNK_PI;
					re = RE_TOKENIZER_PI;
				}
				else
				{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.PI:
			{	if (text == '?>')
				{	yield new Token(text, TokenType.PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
				}
				else
				{	yield new Token(text, TokenType.PI_MID, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.COMMENT_PI:
			{	if (text == '?>')
				{	yield new Token(text, TokenType.COMMENT_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.COMMENT;
					re = RE_TOKENIZER_COMMENT;
				}
				else
				{	yield new Token(text, TokenType.COMMENT_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.CDATA_PI:
			{	if (text == '?>')
				{	yield new Token(text, TokenType.CDATA_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.CDATA;
					re = RE_TOKENIZER_CDATA;
				}
				else
				{	yield new Token(text, TokenType.CDATA_MID_PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.CDATA_JUNK_PI:
			{	if (text == '?>')
				{	yield new Token(text, TokenType.PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.CDATA_JUNK;
					re = RE_TOKENIZER_CDATA;
				}
				else
				{	yield new Token(text, TokenType.PI_MID, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				break;
			}
			case State.TEXT:
			{	if (text.charCodeAt(0) == C_AMP)
				{	// &name; or &
					if (text.length == 1)
					{	yield new Token(text, TokenType.RAW_AMP, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						nColumn++;
					}
					else
					{	yield new Token(text, TokenType.ENTITY, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						countLines(text, 0, text.length);
					}
				}
				else if (text.charCodeAt(0) != C_LT)
				{	// text
					yield new Token(text, TokenType.TEXT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
				}
				else if (text.length < 2)
				{	// <
					yield new Token(text, re==RE_TOKENIZER_SCRIPT || re==RE_TOKENIZER_STYLE ? TokenType.TEXT : TokenType.RAW_LT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn++;
				}
				else if (text.charCodeAt(1) == C_SLASH)
				{	// </name>
					tagName = match[1];
					if (foreignLevel!=-2 && tagName.indexOf('<')==-1)
					{	tagName = tagName.toLowerCase();
					}
					let pos = hierarchy.lastIndexOf(tagName);
					if (pos == -1)
					{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					}
					else
					{	let posEnd = hierarchy.length;
						let structureBoundaryCrossed = false;
						// auto close tags
						while (posEnd > pos+1)
						{	const t = hierarchy[--posEnd];
							structureBoundaryCrossed = structureBoundaryCrossed || !TAGS_NON_STRUCTURE.has(t);
							yield new Token(`</${t}>`, TokenType.FIX_STRUCTURE_TAG_CLOSE, nLine, nColumn, posEnd, t, false, foreignLevel!=-1);
							if (posEnd <= foreignLevel)
							{	foreignLevel = -1;
							}
						}
						if (foreignLevel!=-1 || structureBoundaryCrossed || !TAGS_NON_STRUCTURE.has(tagName))
						{	// finally close the wanted tag
							hierarchy.length = pos;
							yield new Token(text, TokenType.TAG_CLOSE, nLine, nColumn, pos, tagName, false, foreignLevel!=-1);
							if (pos == foreignLevel)
							{	foreignLevel = -1;
							}
						}
						else
						{	// close the wanted tag
							yield new Token(text, TokenType.TAG_CLOSE, nLine, nColumn, pos, tagName, false, false);
							// reopen tags like <b>, <i>, <u>, etc.
							while (pos+1 < hierarchy.length)
							{	const t = hierarchy[pos+1];
								yield new Token(`<${t}>`, TokenType.FIX_STRUCTURE_TAG_OPEN, nLine, nColumn, pos, t, false, false);
								hierarchy[pos++] = t;
							}
							hierarchy.length = pos;
						}
					}
					countLines(text, 0, text.length);
					state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
				}
				else if (text.charCodeAt(1) == C_EXCL)
				{	// <!-- or <![CDATA[ or <!NAME or <![
					if (text.charCodeAt(2) == C_DASH)
					{	yield new Token(text, TokenType.COMMENT_BEGIN, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						nColumn += 4;
						state = State.COMMENT;
						re = RE_TOKENIZER_COMMENT;
					}
					else if (!text.startsWith('<![CDATA['))
					{	yield new Token(text, TokenType.DTD, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						countLines(text, 0, text.length);
					}
					else if (foreignLevel != -1)
					{	yield new Token(text, TokenType.CDATA_BEGIN, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						nColumn += 9;
						state = State.CDATA;
						re = RE_TOKENIZER_CDATA;
					}
					else
					{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						nColumn += 9;
						state = State.CDATA_JUNK;
						re = RE_TOKENIZER_CDATA;
					}
				}
				else if (text.charCodeAt(1) == C_QEST)
				{	// <?
					yield new Token(text, TokenType.PI_BEGIN, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += 2;
					state = State.PI;
					re = RE_TOKENIZER_PI;
				}
				else
				{	// <name ...>
					tagName = text.slice(1);
					if (foreignLevel!=-2 && tagName.indexOf('<')==-1)
					{	tagName = tagName.toLowerCase();
					}
					if (foreignLevel==-1 && (tagName=='svg' || tagName=='math'))
					{	foreignLevel = hierarchy.length;
					}
					yield new Token(text, TokenType.TAG_OPEN_BEGIN, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
					countLines(text, 0, text.length);
					state = State.TAG_OPENED;
					re = RE_TOKENIZER_TAG;
					curAttrs?.clear();
				}
				break;
			}
			default: // TAG_OPENED, BEFORE_ATTR_NAME, AFTER_NAME, AFTER_DUP_NAME
			{	if (text.length<=2 && text.charCodeAt(text.length-1)==C_GT) // '>' or '/>'
				{	state = State.TEXT;
					re = RE_TOKENIZER_TEXT;
					if (foreignLevel == -1)
					{	const isSelfClosing = TAGS_VOID.has(tagName);

						if (text.length == 1)
						{	yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', isSelfClosing, false);
						}
						else if (isSelfClosing)
						{	yield new Token('/>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', true, false);
						}
						else
						{	yield new Token('/', TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, false);
							yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn+1, hierarchy.length, '', false, false);
						}

						if (!isSelfClosing)
						{	hierarchy[hierarchy.length] = tagName;
							if (tagName == 'script')
							{	re = RE_TOKENIZER_SCRIPT;
							}
							else if (tagName == 'style')
							{	re = RE_TOKENIZER_STYLE;
							}
							else if (tagName == 'textarea')
							{	re = RE_TOKENIZER_TEXTAREA;
							}
							else if (tagName == 'title')
							{	re = RE_TOKENIZER_TITLE;
							}
						}
					}
					else
					{	if (text.length == 1)
						{	yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', false, true);
							hierarchy[hierarchy.length] = tagName;
						}
						else
						{	yield new Token('/>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', true, true);
							if (foreignLevel == hierarchy.length)
							{	foreignLevel = -1;
							}
						}
					}
					nColumn += text.length;
				}
				else if (text.charCodeAt(0) == C_EQ)
				{	if (text.length == 1)
					{	yield new Token('=', TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						nColumn++;
					}
					else if (state != State.AFTER_NAME)
					{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						countLines(text, 0, text.length);
					}
					else
					{	RE_SPACE.lastIndex = 1;
						const firstAttrChar = RE_SPACE.test(text) ? RE_SPACE.lastIndex : 1;
						if (firstAttrChar == text.length)
						{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
							countLines(text, 0, text.length);
						}
						else
						{	yield new Token('=', TokenType.ATTR_EQ, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
							nColumn++;
							if (firstAttrChar > 1)
							{	yield new Token(text.slice(1, firstAttrChar), TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
								countLines(text, 1, firstAttrChar);
							}
							const qt = text.charCodeAt(firstAttrChar);
							if (qt==C_QUOT || qt==C_APOS)
							{	let unquote = false;
								if (quoteAttributesMode == QuoteAttributesMode.UNQUOTE)
								{	RE_CAN_UNQUOTE.lastIndex = firstAttrChar + 1;
									unquote = RE_CAN_UNQUOTE.test(text) && RE_CAN_UNQUOTE.lastIndex == text.length-1;
								}
								if (!unquote)
								{	yield new Token(text.slice(firstAttrChar), TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
									nColumn++;
									countLines(text, firstAttrChar+1, text.length-1);
									nColumn++;
								}
								else
								{	const str = text.slice(firstAttrChar+1, -1);
									const qtC = qt==C_QUOT ? '"' : "'";
									yield new Token(qtC, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
									nColumn++;
									yield new Token(str, TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
									countLines(str, 0, str.length);
									yield new Token(qtC, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
									nColumn++;
								}
							}
							else
							{	if (quoteAttributesMode == QuoteAttributesMode.QUOTE)
								{	yield new Token('"', TokenType.FIX_STRUCTURE_ATTR_QUOT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
									yield new Token(text.slice(firstAttrChar), TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
									yield new Token('"', TokenType.FIX_STRUCTURE_ATTR_QUOT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
								}
								else
								{	yield new Token(text.slice(firstAttrChar), TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
								}
								nColumn += text.length - firstAttrChar;
							}
							state = State.TAG_OPENED;
							re = RE_TOKENIZER_TAG;
						}
					}
				}
				else if (text.charCodeAt(0)==C_SLASH || text.charCodeAt(0)==C_QUOT || text.charCodeAt(0)==C_APOS)
				{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					nColumn += text.length;
					state = State.TAG_OPENED;
				}
				else if (!text.trim())
				{	yield new Token(text, TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(text, 0, text.length);
					if (state == State.TAG_OPENED)
					{	state = State.BEFORE_ATTR_NAME;
					}
				}
				else
				{	if (state == State.TAG_OPENED)
					{	yield new Token(' ', TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					}
					let nameLc = text;
					state = State.AFTER_NAME;
					if (curAttrs)
					{	nameLc = foreignLevel!=-2 ? nameLc.toLowerCase() : text;
						if (curAttrs.has(nameLc))
						{	state = State.AFTER_DUP_NAME;
						}
						else
						{	curAttrs.add(nameLc);
						}
					}
					yield new Token(text, state==State.AFTER_DUP_NAME ? TokenType.JUNK_DUP_ATTR_NAME : TokenType.ATTR_NAME, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
					countLines(text, 0, text.length);
					re = RE_TOKENIZER_ATTR_VALUE;
				}
				break;
			}
		}
	}

	switch (state)
	{	case State.TAG_OPENED:
		case State.BEFORE_ATTR_NAME:
		case State.AFTER_NAME:
		case State.AFTER_DUP_NAME:
			yield new Token('>', TokenType.FIX_STRUCTURE_TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			if (!TAGS_VOID.has(tagName))
			{	yield new Token(`</${tagName}>`, TokenType.FIX_STRUCTURE_TAG_CLOSE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			}
			break;
		case State.COMMENT:
			yield new Token('-->', TokenType.FIX_STRUCTURE_COMMENT_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
		case State.CDATA:
			yield new Token(']]>', TokenType.FIX_STRUCTURE_CDATA_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
		case State.PI:
			yield new Token('?>', TokenType.FIX_STRUCTURE_PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
		case State.COMMENT_PI:
			yield new Token('?>', TokenType.FIX_STRUCTURE_PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			yield new Token('-->', TokenType.FIX_STRUCTURE_COMMENT_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
		case State.CDATA_PI:
			yield new Token('?>', TokenType.FIX_STRUCTURE_PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			yield new Token(']]>', TokenType.FIX_STRUCTURE_CDATA_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
		case State.CDATA_JUNK_PI:
			yield new Token('?>', TokenType.FIX_STRUCTURE_PI_END, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			break;
	}

	for (let pos=hierarchy.length-1; pos>=0; pos--)
	{	const t = hierarchy[pos];
		yield new Token(`</${t}>`, TokenType.FIX_STRUCTURE_TAG_CLOSE, nLine, nColumn, pos, t, false, foreignLevel!=-1);
	}
}
