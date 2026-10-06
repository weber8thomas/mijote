import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// La liste de courses et ses échanges avec le serveur du foyer (GET /api/watch/list, POST /api/watch/check).
// Une requête à la fois : le Bluetooth en supporte peu en parallèle. Les coches attendent dans une file gardée
// dans Storage ; faites hors ligne, elles partent au prochain rafraîchissement. La dernière liste reste en cache.
class Shop {
    private var _url as String = "";
    private var _token as String = "";
    // Dernière liste : semaine, articles [clé, nom, « quantité · rayon », coché], restants, articles coupés.
    private var _week as String = "";
    private var _rows as Array;
    private var _left as Number = 0;
    private var _more as Number = 0;
    // Coches à envoyer : [clé, coché, actionId, semaine].
    private var _pending as Array;
    private var _busy as Boolean = false;
    private var _wantList as Boolean = false;
    private var _status as String = "";
    private var _focusKey as String? = null;
    private var _menu as WatchUi.Menu2? = null;
    private var _count as Number = 0;
    private var _seq as Number = 0;
    // Affichage (réglé sur la montre, gardé dans Storage) : 0 auto, 1 complet, 2 sans quantité, 3 compact.
    private var _mode as Number = 0;
    private var _hideDone as Boolean = false;
    private var _heads as Boolean = false;
    private var _first as Number = 0;
    // Tri : 0 par rayon (ordre du serveur), 1 alphabétique, 2 ordre d'ajout. Taille (Compact) : 0 petit, 1 moyen, 2 grand.
    private var _sort as Number = 0;
    private var _size as Number = 0;
    // Taille du CustomMenu affiché (-1 : menu standard), pour savoir quand le remplacer.
    private var _built as Number = -1;
    // Le menu affiché est-il un CustomMenu (mode Compact) ?
    private var _custom as Boolean = false;
    private var _synced as String = "";

    function initialize() {
        _rows = [];
        _pending = [];
        readSettings();
        load();
    }

    // ——— Réglages et cache ———

    function readSettings() as Void {
        _url = clean(Application.Properties.getValue("serverUrl"), true);
        _token = clean(Application.Properties.getValue("token"), false);
    }

    // Réglage sans espaces autour ; l'adresse sans « / » final, en https si rien n'est précisé.
    private function clean(value as Object?, isUrl as Boolean) as String {
        if (!(value instanceof String)) {
            return "";
        }
        var str = value as String;
        var chars = str.toCharArray();
        var a = 0;
        var b = chars.size();
        while (a < b && chars[a] == ' ') {
            a++;
        }
        while (b > a && (chars[b - 1] == ' ' || (isUrl && chars[b - 1] == '/'))) {
            b--;
        }
        if (a >= b) {
            return "";
        }
        var s = str.substring(a, b) as String;
        if (isUrl && s.find("://") == null) {
            s = "https://" + s;
        }
        return s;
    }

    private function load() as Void {
        var list = Application.Storage.getValue("list");
        if (list instanceof Dictionary) {
            take(list as Dictionary);
        }
        var mode = Application.Storage.getValue("mode");
        if (mode instanceof Number && (mode as Number) >= 0 && (mode as Number) < 4) {
            _mode = mode as Number;
        }
        var sort = Application.Storage.getValue("sort");
        if (sort instanceof Number && (sort as Number) >= 0 && (sort as Number) < 3) {
            _sort = sort as Number;
        }
        var size = Application.Storage.getValue("size");
        if (size instanceof Number && (size as Number) >= 0 && (size as Number) < 3) {
            _size = size as Number;
        }
        _hideDone = Application.Storage.getValue("hide") == true;
        _heads = Application.Storage.getValue("heads") == true;
        var pending = Application.Storage.getValue("pending");
        if (pending instanceof Array) {
            _pending = pending as Array;
            overlay();
        }
    }

    function save() as Void {
        store("pending", _pending);
        if (!_week.equals("")) {
            store("list", {"w" => _week, "i" => _rows, "left" => _left, "more" => _more});
        }
    }

    private function store(key as String, value) as Void {
        try {
            Application.Storage.setValue(key, value);
        } catch (e) {
            // Stockage plein : pas de cache cette fois, la liste reste à l'écran.
        }
    }

    // ——— Liste ———

    // Lit une liste (du serveur ou du cache). Faux si elle est mal formée.
    private function take(data as Dictionary) as Boolean {
        var w = data["w"];
        var rows = data["i"];
        if (!(w instanceof String) || !(rows instanceof Array)) {
            return false;
        }
        _week = w as String;
        _rows = rows as Array;
        _left = number(data["left"]);
        _more = number(data["more"]);
        return true;
    }

    private function number(v as Object?) as Number {
        return (v instanceof Number) ? v as Number : 0;
    }

    // Les coches pas encore envoyées s'appliquent par-dessus la liste reçue.
    private function overlay() as Void {
        for (var n = 0; n < _pending.size(); n++) {
            var p = _pending[n] as Array;
            if ((p[3] as String).equals(_week)) {
                setRow(p[0] as String, p[1] as Boolean);
            }
        }
    }

    private function row(k as String) as Array? {
        for (var n = 0; n < _rows.size(); n++) {
            var r = _rows[n] as Array;
            if ((r[0] as String).equals(k)) {
                return r;
            }
        }
        return null;
    }

    private function setRow(k as String, c as Boolean) as Void {
        var r = row(k);
        if (r != null && r[3] != c) {
            r[3] = c;
            _left += c ? -1 : 1;
        }
    }

    private function keys() as String {
        var s = "";
        for (var n = 0; n < _rows.size(); n++) {
            s = s + ((_rows[n] as Array)[0] as String) + ",";
        }
        return s;
    }

    private function waiting(k as String) as Boolean {
        for (var n = 0; n < _pending.size(); n++) {
            if (((_pending[n] as Array)[0] as String).equals(k)) {
                return true;
            }
        }
        return false;
    }

    // ——— Menu ———

    function buildMenu() as WatchUi.Menu2 {
        var menu;
        if (_mode == 3) {
            // Compact : lignes dessinées par l'appli (Row), petite police, peu de hauteur.
            _custom = true;
            _built = _size;
            menu = new WatchUi.CustomMenu(([22, 26, 30] as Array<Number>)[_size], Graphics.COLOR_BLACK, {});
            menu.addItem(new Row(:refresh, 2, topText(), false, rowPx()));
        } else {
            _custom = false;
            _built = -1;
            menu = new WatchUi.Menu2({:title => menuTitle()});
            menu.addItem(new WatchUi.MenuItem("Rafraîchir", _status.equals("") ? null : _status, :refresh, null));
        }
        _menu = menu;
        fill(menu);
        menu.setFocus(focusIndex(menu));
        return menu;
    }

    // Un article par ligne, après la ligne « Rafraîchir » ; « Réglages » tout en bas (on y arrive en remontant depuis « Rafraîchir »).
    private function fill(menu as WatchUi.Menu2) as Void {
        _count = 1;
        _first = 0;
        var last = "";
        var shown = 0;
        var order = ordered();
        for (var o = 0; o < order.size(); o++) {
            var r = _rows[order[o]] as Array;
            if (_hideDone && r[3] == true) {
                continue;
            }
            // Titres de rayon seulement dans l'ordre par rayon.
            if (_heads && _sort == 0) {
                var g = r[3] == true ? "Cochés" : aisle(r);
                if (!g.equals(last)) {
                    menu.addItem(headItem(g));
                    _count++;
                    last = g;
                }
            }
            menu.addItem(articleItem(r));
            if (_first == 0) {
                _first = _count;
            }
            _count++;
            shown++;
        }
        if (_more > 0) {
            menu.addItem(actionItem(:more, "+" + _more.toString() + " articles", "Sur le téléphone"));
            _count++;
        }
        if (shown == 0) {
            menu.addItem(actionItem(:none, _week.equals("") ? "Pas encore de liste" : "Rien à acheter", null));
            _count++;
        }
        menu.addItem(actionItem(:settings, "Réglages", modeName()));
        _count++;
    }

    // Les lignes selon le menu affiché : Row en Compact (CustomMenu), éléments standard sinon.
    private function articleItem(r as Array) {
        if (_custom) {
            return new Row(r[0] as String, 0, r[1] as String, r[3] as Boolean, rowPx());
        }
        return new WatchUi.ToggleMenuItem(fit(r[1] as String), sub(r), r[0] as String, r[3] as Boolean, null);
    }

    private function headItem(g as String) {
        var t = "— " + g + " —";
        return _custom ? new Row(:head, 1, t, false, rowPx()) : new WatchUi.MenuItem(t, null, :head, null);
    }

    private function actionItem(id as Symbol, label as String, detail as String?) {
        return _custom ? new Row(id, 2, label, false, rowPx()) : new WatchUi.MenuItem(label, detail, id, null);
    }

    // Compact : la première ligne dit « N à acheter », ou l'état s'il n'est pas « à jour » (Téléphone absent…).
    private function topText() as String {
        return (_status.equals("") || _status.find("À jour") == 0) ? menuTitle() : _status;
    }

    private function rowPx() as Number {
        return ([17, 19, 22] as Array<Number>)[_size];
    }

    // Ordre d'affichage : indices des lignes. Par rayon : celui du serveur. Sinon tri par insertion (80 lignes au plus),
    // les cochés en dernier, sur le rang envoyé par le serveur (la position reçue pour une liste en cache plus ancienne).
    private function ordered() as Array<Number> {
        var n = _rows.size();
        var idx = new [n] as Array<Number>;
        for (var i = 0; i < n; i++) {
            idx[i] = i;
        }
        if (_sort == 0) {
            return idx;
        }
        var f = _sort == 1 ? 6 : 7;
        for (var i = 1; i < n; i++) {
            var cur = idx[i];
            var ck = rank(cur, f);
            var j = i - 1;
            while (j >= 0 && rank(idx[j], f) > ck) {
                idx[j + 1] = idx[j];
                j--;
            }
            idx[j + 1] = cur;
        }
        return idx;
    }

    private function rank(i as Number, f as Number) as Number {
        var r = _rows[i] as Array;
        return (r[3] == true ? 100000 : 0) + (r.size() > f ? number(r[f]) : i);
    }

    // Mode ou taille changés dans les réglages : si le type de menu change (taille du CustomMenu), on remplace le menu à la sortie.
    function applyKind() as Void {
        if ((_mode == 3 ? _size : -1) != _built) {
            WatchUi.switchToView(buildMenu(), new ShopDelegate(self), WatchUi.SLIDE_IMMEDIATE);
        }
    }

    private function retitle(menu as WatchUi.Menu2) as Void {
        if (_custom) {
            var top = menu.getItem(0);
            if (top instanceof Row) {
                (top as Row).setText(topText());
            }
        } else {
            menu.setTitle(menuTitle());
        }
    }

    // Rayon seul d'une ligne (les listes en cache d'une ancienne version n'ont que « quantité · rayon »).
    private function aisle(r as Array) as String {
        return r.size() > 5 ? r[5] as String : r[2] as String;
    }

    // Sous-libellé d'une ligne selon le mode ; rien en mode compact.
    private function sub(r as Array) as String? {
        if (_mode == 1) {
            return r[2] as String;
        }
        if (_mode == 3) {
            return null;
        }
        var a = aisle(r);
        if (_mode == 2) {
            return a;
        }
        // Auto : la quantité seulement au-delà d'une pièce, sans unité (« ×3 · Fruits »).
        var q = r.size() > 4 ? r[4] : 0;
        var x = (q instanceof Number || q instanceof Float) ? (q as Numeric).toFloat() : 0.0;
        if (x > 1.0) {
            var whole = x.toNumber();
            return "×" + whole.toString() + (x - whole > 0.25 ? ",5" : "") + " · " + a;
        }
        return a;
    }

    // Liste reçue : mise à jour sur place si ce sont les mêmes articles, sinon on remplit à nouveau.
    private function redraw(same as Boolean) as Void {
        var menu = _menu;
        if (menu == null) {
            return;
        }
        retitle(menu);
        // Sur place seulement si les lignes se suivent sans titre ni coché masqué (sinon leurs places changent).
        if (same && !_hideDone && !_heads && !_custom && _sort == 0) {
            for (var n = 0; n < _rows.size(); n++) {
                var r = _rows[n] as Array;
                var item = menu.getItem(n + 1);
                if (item instanceof WatchUi.ToggleMenuItem) {
                    var t = item as WatchUi.ToggleMenuItem;
                    t.setLabel(fit(r[1] as String));
                    var s = sub(r);
                    if (s != null) {
                        t.setSubLabel(s);
                    }
                    t.setEnabled(r[3] as Boolean);
                }
            }
        } else {
            for (var n = _count - 1; n >= 1; n--) {
                menu.deleteItem(n);
            }
            fill(menu);
            menu.setFocus(focusIndex(menu));
        }
        WatchUi.requestUpdate();
    }

    // Focus : le dernier article coché, sinon le premier de la liste.
    private function focusIndex(menu as WatchUi.Menu2) as Number {
        var k = _focusKey;
        if (k != null) {
            var i = menu.findItemById(k);
            if (i >= 0) {
                return i;
            }
        }
        return _first;
    }

    // L'écran rond coupe net les libellés trop longs : on raccourcit avec « … ».
    private function fit(label as String) as String {
        if (label.length() <= 15) {
            return label;
        }
        return (label.substring(0, 14) as String) + "…";
    }

    // ——— Réglages d'affichage ———

    function modeName() as String {
        return ["Auto", "Complet", "Sans quantité", "Compact"][_mode] as String;
    }

    function hideName() as String {
        return _hideDone ? "Masqués" : "Visibles";
    }

    function sortName() as String {
        return (["Par rayon", "A → Z", "Ordre d'ajout"] as Array<String>)[_sort];
    }

    function sizeName() as String {
        return (["Petit", "Moyen", "Grand"] as Array<String>)[_size];
    }

    function headsName() as String {
        return _heads ? "Titres" : "Sans titre";
    }

    function buildSettings() as WatchUi.Menu2 {
        var m = new WatchUi.Menu2({:title => "Réglages"});
        m.addItem(new WatchUi.MenuItem("Affichage", modeName(), :mode, null));
        m.addItem(new WatchUi.MenuItem("Tri", sortName(), :sort, null));
        m.addItem(new WatchUi.MenuItem("Taille (Compact)", sizeName(), :size, null));
        m.addItem(new WatchUi.MenuItem("Cochés", hideName(), :hide, null));
        m.addItem(new WatchUi.MenuItem("Rayons", headsName(), :heads, null));
        m.addItem(new WatchUi.MenuItem("Statut", null, :status, null));
        return m;
    }

    function nextMode() as Void {
        _mode = (_mode + 1) % 4;
        store("mode", _mode);
        redraw(false);
    }

    function nextSort() as Void {
        _sort = (_sort + 1) % 3;
        store("sort", _sort);
        redraw(false);
    }

    function nextSize() as Void {
        _size = (_size + 1) % 3;
        store("size", _size);
    }

    function flipHide() as Void {
        _hideDone = !_hideDone;
        store("hide", _hideDone);
        redraw(false);
    }

    function flipHeads() as Void {
        _heads = !_heads;
        store("heads", _heads);
        redraw(false);
    }

    // ——— Statut ———

    // GET /api/watch/status : le serveur répond-il, sa version, Home Assistant, ce qui reste.
    function fetchStatus(cb as Method) as Void {
        if (_url.equals("") || _token.equals("")) {
            cb.invoke(0, null);
            return;
        }
        Communications.makeWebRequest(
            _url + "/api/watch/status",
            null,
            {
                :method => Communications.HTTP_REQUEST_METHOD_GET,
                :headers => {"Authorization" => "Bearer " + _token},
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
            },
            cb
        );
    }

    // Lignes de l'écran « Statut ».
    function statusLines(code as Number, data as Dictionary or String or Null) as Array<String> {
        var lines = [] as Array<String>;
        if (code == 200 && data instanceof Dictionary) {
            var d = data as Dictionary;
            lines.add("Serveur en ligne");
            lines.add("v" + number(d["ver"]).toString() + " · HA " + (d["ha"] == true ? "oui" : "non"));
            lines.add(number(d["left"]).toString() + " à acheter / " + number(d["total"]).toString());
        } else if (code == 0) {
            lines.add("Règle URL et jeton");
        } else {
            lines.add("Serveur injoignable");
            lines.add(message(code));
        }
        lines.add("En attente : " + _pending.size().toString());
        lines.add(_synced.equals("") ? "Pas encore synchro" : "Synchro " + _synced);
        return lines;
    }

    private function menuTitle() as String {
        if (_week.equals("")) {
            return "Mijoté";
        }
        return (_left > 0 ? _left : 0).toString() + " à acheter";
    }

    private function updateTitle() as Void {
        var menu = _menu;
        if (menu != null) {
            retitle(menu);
            WatchUi.requestUpdate();
        }
    }

    // L'état s'affiche sous « Rafraîchir ».
    private function setStatus(s as String) as Void {
        _status = s;
        var menu = _menu;
        if (menu != null) {
            if (_custom) {
                retitle(menu);
            } else {
                var item = menu.getItem(0);
                if (item != null) {
                    item.setSubLabel(s);
                }
            }
            WatchUi.requestUpdate();
        }
    }

    // Article coché ou décoché, à l'écran (sans requête).
    private function show(k as String, c as Boolean) as Void {
        setRow(k, c);
        var menu = _menu;
        if (menu != null) {
            var i = menu.findItemById(k);
            if (i >= 0) {
                var item = menu.getItem(i);
                if (item instanceof WatchUi.ToggleMenuItem) {
                    (item as WatchUi.ToggleMenuItem).setEnabled(c);
                } else if (item instanceof Row) {
                    (item as Row).setChecked(c);
                }
            }
        }
        updateTitle();
    }

    // ——— Actions ———

    // « Rafraîchir » (et l'ouverture) : envoie les coches en attente, puis recharge la liste.
    function refresh() as Void {
        _wantList = true;
        pump();
    }

    // START sur un article : le menu l'a déjà basculé, on garde la coche et on l'envoie.
    function toggle(k as String, c as Boolean) as Void {
        setRow(k, c);
        if (_pending.size() >= 100) {
            _pending = _pending.slice(1, null);
        }
        _seq++;
        _pending.add([k, c, actionId(), _week]);
        _focusKey = k;
        store("pending", _pending);
        updateTitle();
        pump();
    }

    // Identifiant unique d'une coche (date, compteur, aléa) : le serveur ignore un renvoi.
    private function actionId() as String {
        return Time.now().value().toString() + "-" + _seq.toString() + "-" + (Math.rand() % 1000000).toString();
    }

    private function pump() as Void {
        if (_busy) {
            return;
        }
        if (_url.equals("") || _token.equals("")) {
            setStatus("Règle URL et jeton");
            return;
        }
        if (_pending.size() > 0) {
            var p = _pending[0] as Array;
            _busy = true;
            setStatus("Envoi...");
            Communications.makeWebRequest(
                _url + "/api/watch/check",
                {"k" => p[0], "c" => p[1], "w" => p[3], "a" => p[2]},
                {
                    :method => Communications.HTTP_REQUEST_METHOD_POST,
                    :headers => {"Authorization" => "Bearer " + _token, "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON},
                    :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
                },
                method(:onCheck)
            );
        } else if (_wantList) {
            _wantList = false;
            _busy = true;
            setStatus("Chargement...");
            Communications.makeWebRequest(
                _url + "/api/watch/list",
                null,
                {
                    :method => Communications.HTTP_REQUEST_METHOD_GET,
                    :headers => {"Authorization" => "Bearer " + _token},
                    :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
                },
                method(:onList)
            );
        }
    }

    function onCheck(code as Number, data as Dictionary or String or Null) as Void {
        _busy = false;
        if (_pending.size() == 0) {
            pump();
            return;
        }
        // 200 : fait. 400 : refusée pour de bon. 409 : semaine changée ou article disparu → on recharge.
        if (code == 200 || code == 400 || code == 409) {
            var k = (_pending[0] as Array)[0] as String;
            _pending = _pending.slice(1, null);
            store("pending", _pending);
            if (code == 200 && data instanceof Dictionary) {
                // L'état du serveur fait foi (un renvoi ignoré redonne la vraie valeur), sauf si une autre coche attend.
                if (!waiting(k)) {
                    show(k, (data as Dictionary)["c"] == true);
                }
                vibe(true);
            } else {
                _wantList = true;
            }
            if (_pending.size() == 0 && !_wantList) {
                setStatus(upToDate());
                save();
            }
            pump();
            return;
        }
        fail(code);
    }

    function onList(code as Number, data as Dictionary or String or Null) as Void {
        _busy = false;
        if (code != 200 || !(data instanceof Dictionary)) {
            fail(code);
            return;
        }
        var d = data as Dictionary;
        if (d["v"] != 1) {
            setStatus("Mets à jour l'appli");
            return;
        }
        var before = keys();
        var beforeMore = _more;
        if (!take(d)) {
            fail(-400);
            return;
        }
        overlay();
        save();
        redraw(before.equals(keys()) && beforeMore == _more);
        setStatus(upToDate());
        // Des coches faites pendant le chargement attendent peut-être.
        pump();
    }

    private function fail(code as Number) as Void {
        var m = message(code);
        if (_pending.size() > 0) {
            m = m + " (" + _pending.size().toString() + ")";
            vibe(false);
        }
        setStatus(m);
    }

    private function message(code as Number) as String {
        if (code == -104) {
            return "Téléphone absent";
        }
        if (code == -2 || code == -300) {
            return "Pas de réponse";
        }
        if (code == -101) {
            return "Réessaie";
        }
        if (code == -1001 || code == 403) {
            return "https requis";
        }
        if (code == -400) {
            return "Réponse illisible";
        }
        if (code == -402 || code == -403) {
            return "Liste trop longue";
        }
        if (code == 401) {
            return "Jeton refusé";
        }
        if (code == 404) {
            return "Montre non activée";
        }
        if (code == 429) {
            return "Trop d'essais";
        }
        if (code >= 500) {
            return "Serveur en panne";
        }
        return "Erreur " + code.toString();
    }

    private function upToDate() as String {
        var t = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        _synced = (t.hour as Number).format("%02d") + ":" + (t.min as Number).format("%02d");
        return "À jour " + _synced;
    }

    // Vibration courte : coche enregistrée. Longue : coche pas envoyée.
    private function vibe(ok as Boolean) as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(ok ? 50 : 100, ok ? 80 : 500)]);
        }
    }
}
