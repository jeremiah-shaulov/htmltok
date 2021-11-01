import {htmlDecode} from "./entities.ts";
import {assertEquals} from "https://deno.land/std@0.106.0/testing/asserts.ts";

Deno.test
(	'Basic',
	() =>
	{	assertEquals(htmlDecode('a&&amp;&Dfr;b&<??>&lt;c&<?&lt;?>d', true), 'a&&\uD835\uDD07b&<??><c&<?&lt;?>d');
		assertEquals(htmlDecode('a&&amp;&Dfr;b&<??>&lt;c&<?&lt;?>d', false), 'a&&\uD835\uDD07b&<??><c&<?<?>d');

		assertEquals(htmlDecode('<?&lt;', true), '<?&lt;');
		assertEquals(htmlDecode('<?&lt;', false), '<?<');

		assertEquals(htmlDecode('&<?&lt;', true), '&<?&lt;');
		assertEquals(htmlDecode('&<?&lt;', false), '&<?<');

		assertEquals(htmlDecode('<?&lt;?>&lt;', true), '<?&lt;?><');
		assertEquals(htmlDecode('<?&lt;?>&lt;', false), '<?<?><');

		assertEquals(htmlDecode('a&#60;&#600;&#6000;&#60000;&#600000;b&#0&', true), 'a\u003C\u0258\u1770\uEA60\u{927C0}b&#0&');
		assertEquals(htmlDecode('a&#x60;&#xa00;&#x6000;&#xD888;&#x60000;b&#x0&', true), 'a\u0060\u0a00\u6000\uD888\u{60000}b&#x0&');
		assertEquals(htmlDecode('&lt;&hello;&hello012345678901234567890123456789;&gt;', true), '<&hello;&hello012345678901234567890123456789;>');
	}
);
