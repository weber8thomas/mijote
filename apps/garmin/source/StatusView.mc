import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Écran « Statut » : interroge le serveur à l'ouverture et affiche ce qu'il répond. RETOUR revient aux réglages.
class StatusView extends WatchUi.View {
    private var _shop as Shop;
    private var _lines as Array<String> = ["Chargement..."] as Array<String>;
    private var _up as Boolean = true;

    function initialize(shop as Shop) {
        View.initialize();
        _shop = shop;
    }

    function onShow() as Void {
        _shop.fetchStatus(method(:onStatus));
    }

    function onStatus(code as Number, data as Dictionary or String or Null) as Void {
        _up = code == 200;
        _lines = _shop.statusLines(code, data);
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var h = dc.getFontHeight(Graphics.FONT_SMALL) + 4;
        var y = (dc.getHeight() - h * _lines.size()) / 2;
        for (var n = 0; n < _lines.size(); n++) {
            dc.setColor(n == 0 ? (_up ? Graphics.COLOR_GREEN : Graphics.COLOR_RED) : Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
            dc.drawText(dc.getWidth() / 2, y + n * h, Graphics.FONT_SMALL, _lines[n], Graphics.TEXT_JUSTIFY_CENTER);
        }
    }
}
