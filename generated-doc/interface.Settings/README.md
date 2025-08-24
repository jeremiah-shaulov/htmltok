# `interface` Settings

[Documentation Index](../README.md)

```ts
import {Settings} from "https://deno.land/x/htmltok@v3.0.0/mod.ts"
```

## This interface has

- 5 properties:
[mode](#-mode-html--xml),
[noCheckAttributes](#-nocheckattributes-boolean),
[quoteAttributes](#-quoteattributes-boolean),
[unquoteAttributes](#-unquoteattributes-boolean),
[maxTokenLength](#-maxtokenlength-number)


#### 📄 mode?: <mark>"html"</mark> | <mark>"xml"</mark>

> Tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies [Settings.quoteAttributes](../interface.Settings/README.md#-quoteattributes-boolean).



#### 📄 noCheckAttributes?: `boolean`

> If `true`, will not try to determine duplicate attribute names. This can save some computing resources.



#### 📄 quoteAttributes?: `boolean`

> If `true`, will generate [TokenType.FIX\_STRUCTURE\_ATTR\_QUOT](../enum.TokenType/README.md#fix_structure_attr_quot--29) tokens to suggest quotes around unquoted attribute values.



#### 📄 unquoteAttributes?: `boolean`

> If `true`, will return quotes around attribute values as [TokenType.JUNK](../enum.TokenType/README.md#junk--23), if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.



#### 📄 maxTokenLength?: `number`

> Default value: `16 KiB`
> 
> If single unsplittable token exceeds this length, an exception will be thrown.
> However this check is only performed before issuing [TokenType.MORE\_REQUEST](../enum.TokenType/README.md#more_request--33) (so tokens can be longer as long as there's enough space in the buffer).
> Some tokens are splittable (are returned by parts), like comments, CDATA sections, and text, so this setting doesn't apply to them.
> Unsplitable tokens include: attribute names, attribute values and DTD.



