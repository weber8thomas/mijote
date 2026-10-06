import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Ligne du mode Compact (CustomMenu) : police et hauteur choisies par l'appli, ce que Menu2 ne permet pas.
class Row extends WatchUi.CustomMenuItem {
    // 0 article (avec coche), 1 titre de rayon, 2 action (Rafraîchir, Réglages, « +N articles »).
    private var _kind as Number;
    private var _text as String;
    private var _checked as Boolean;
    // Taille du texte en pixels (réglage « Taille »).
    private var _px as Number;

    function initialize(id as Object, kind as Number, text as String, checked as Boolean, px as Number) {
        CustomMenuItem.initialize(id, {});
        _kind = kind;
        _text = text;
        _checked = checked;
        _px = px;
    }

    function isArticle() as Boolean {
        return _kind == 0;
    }

    function isChecked() as Boolean {
        return _checked;
    }

    function flip() as Boolean {
        _checked = !_checked;
        return _checked;
    }

    function setChecked(c as Boolean) as Void {
        _checked = c;
    }

    function setText(t as String) as Void {
        _text = t;
    }

    // Police la plus petite possible : vectorielle si la montre sait (taille en pixels), sinon la plus petite police fixe.
    private function pick(px as Number) as FontType {
        if (Graphics has :getVectorFont) {
            var f = Graphics.getVectorFont({:face => ["RobotoCondensedBold", "RobotoRegular"], :size => px});
            if (f != null) {
                return f;
            }
        }
        return Graphics.FONT_XTINY;
    }

    function draw(dc as Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var font = pick(_kind == 1 ? _px - 4 : _px);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        if (_kind == 1) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h / 2, font, clip(dc, _text, font, w - 70), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }
        var room = w - 38 - (_kind == 0 ? 56 : 30);
        dc.setColor(_kind == 0 && _checked ? Graphics.COLOR_LT_GRAY : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(34, h / 2, font, clip(dc, _text, font, room), Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        if (_kind == 0) {
            var b = _px - 7;
            var x = w - 54;
            var y = (h - b) / 2;
            if (_checked) {
                dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(x, y, b, b);
            } else {
                dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.drawRectangle(x, y, b, b);
            }
        }
    }

    // Texte raccourci avec « … » pour tenir dans `maxW` pixels.
    private function clip(dc as Dc, s as String, font as FontType, maxW as Number) as String {
        if (dc.getTextWidthInPixels(s, font) <= maxW) {
            return s;
        }
        var n = s.length();
        while (n > 1 && dc.getTextWidthInPixels((s.substring(0, n) as String) + "…", font) > maxW) {
            n--;
        }
        return (s.substring(0, n) as String) + "…";
    }
}
