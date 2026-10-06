import Toybox.Lang;
import Toybox.WatchUi;

// Boutons de la liste : HAUT/BAS défilent (géré par le menu), START coche, rafraîchit ou ouvre les réglages, RETOUR quitte (par défaut).
class ShopDelegate extends WatchUi.Menu2InputDelegate {
    private var _shop as Shop;

    function initialize(shop as Shop) {
        Menu2InputDelegate.initialize();
        _shop = shop;
    }

    function onSelect(item as MenuItem) as Void {
        var id = item.getId();
        if (id instanceof String && item instanceof WatchUi.ToggleMenuItem) {
            // Le ToggleMenuItem a déjà basculé : isEnabled() est la nouvelle valeur.
            _shop.toggle(id as String, (item as WatchUi.ToggleMenuItem).isEnabled());
        } else if (id instanceof String && item instanceof Row) {
            // Mode Compact : la ligne ne bascule pas seule.
            _shop.toggle(id as String, (item as Row).flip());
        } else if (id == :refresh) {
            _shop.refresh();
        } else if (id == :settings) {
            WatchUi.pushView(_shop.buildSettings(), new SettingsDelegate(_shop), WatchUi.SLIDE_LEFT);
        }
    }
}
