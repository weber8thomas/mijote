import Toybox.Application;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;
import Toybox.WatchUi;

// Mijoté au poignet : la liste de courses de la semaine, cochable aux boutons.
// La montre ne parle qu'au serveur du foyer (/api/watch), par le téléphone.
class MijoteApp extends Application.AppBase {
    private var _shop as Shop?;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
        Math.srand(System.getTimer());
        _shop = new Shop();
    }

    function onStop(state as Dictionary?) as Void {
        var shop = _shop;
        if (shop != null) {
            shop.save();
        }
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new StartView(_shop as Shop)];
    }

    // Réglages changés (simulateur, Garmin Connect) : on relit et on recharge.
    function onSettingsChanged() as Void {
        var shop = _shop;
        if (shop != null) {
            shop.readSettings();
            shop.refresh();
        }
    }
}
