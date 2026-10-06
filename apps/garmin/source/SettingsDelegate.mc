import Toybox.Lang;
import Toybox.WatchUi;

// Réglages d'affichage : START change la valeur de la ligne (elle est gardée sur la montre), RETOUR revient à la liste.
class SettingsDelegate extends WatchUi.Menu2InputDelegate {
    private var _shop as Shop;

    function initialize(shop as Shop) {
        Menu2InputDelegate.initialize();
        _shop = shop;
    }

    // Retour à la liste ; si le mode change de type de menu (Compact ↔ autres), la liste est remplacée.
    function onBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        _shop.applyKind();
    }

    function onSelect(item as MenuItem) as Void {
        var id = item.getId();
        if (id == :mode) {
            _shop.nextMode();
            item.setSubLabel(_shop.modeName());
        } else if (id == :sort) {
            _shop.nextSort();
            item.setSubLabel(_shop.sortName());
        } else if (id == :size) {
            _shop.nextSize();
            item.setSubLabel(_shop.sizeName());
        } else if (id == :hide) {
            _shop.flipHide();
            item.setSubLabel(_shop.hideName());
        } else if (id == :heads) {
            _shop.flipHeads();
            item.setSubLabel(_shop.headsName());
        } else if (id == :status) {
            WatchUi.pushView(new StatusView(_shop), new WatchUi.BehaviorDelegate(), WatchUi.SLIDE_LEFT);
        }
    }
}
