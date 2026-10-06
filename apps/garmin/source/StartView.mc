import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Vue d'accueil : ouvre la liste tout de suite. Quand la liste se ferme (BACK), elle se ferme aussi et l'appli s'arrête.
class StartView extends WatchUi.View {
    private var _shop as Shop;
    private var _opened as Boolean = false;

    function initialize(shop as Shop) {
        View.initialize();
        _shop = shop;
    }

    function onShow() as Void {
        if (_opened) {
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
            return;
        }
        _opened = true;
        WatchUi.pushView(_shop.buildMenu(), new ShopDelegate(_shop), WatchUi.SLIDE_IMMEDIATE);
        _shop.refresh();
    }

    function onUpdate(dc as Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        dc.drawText(dc.getWidth() / 2, dc.getHeight() / 2, Graphics.FONT_MEDIUM, "Mijoté", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}
