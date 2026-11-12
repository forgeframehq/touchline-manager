extends Screen
## Messages from the board and staff, newest first. Opening the inbox marks them read.

var page := 0

func build() -> void:
	var c := career()
	root.add_child(header("Inbox", "%d message%s" % [c.inbox.size(), "" if c.inbox.size() == 1 else "s"], null, true))
	var per := maxi(3, int((h - 62 - 48) / 96))
	var pages := maxi(1, int(ceil(c.inbox.size() / float(per))))
	var v := UI.vbox(8)
	UI.grow(v, true, true)
	for m in c.inbox.slice(page * per, page * per + per):
		var p := UI.panel(12, UI.PANEL, 14, UI.ACCENT if not m.read else UI.LINE)
		p.custom_minimum_size.y = 88
		var pv := UI.vbox(4)
		var hb := UI.hbox(8)
		hb.add_child(UI.grow(UI.label(m.from, 13, UI.TEXT, 700)))
		hb.add_child(UI.label("%s · week %d" % [UI.season_label(m.season), m.week + 1], 11, UI.MUTED))
		pv.add_child(hb)
		var l := UI.label(m.text, 13, UI.MUTED)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.max_lines_visible = 3
		pv.add_child(l)
		p.add_child(pv)
		v.add_child(p)
		m.read = true
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(pager("Page %d of %d" % [page + 1, pages], page, pages, func(d):
		page += d
		rebuild()))
