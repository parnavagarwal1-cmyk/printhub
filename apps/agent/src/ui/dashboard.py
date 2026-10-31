import sys
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
from typing import Dict, Any, List

class AgentDashboardUI:
    """
    Modern desktop GUI for PrintFlow Windows Agent.
    Displays pairing state, installed USB & Wi-Fi printers, live spooler queue,
    heartbeat indicator, and manual synchronization controls.
    """

    def __init__(self, agent_controller):
        self.controller = agent_controller
        self.root = tk.Tk()
        self.root.title("PrintFlow Agent — Automated Printing Service")
        self.root.geometry("780x560")
        self.root.minsize(700, 500)
        self.root.configure(bg="#0f172a") # Slate-900

        self._apply_styles()
        self._build_header()
        self._build_content()
        self._build_footer()

        # Update loop
        self.root.after(1000, self._periodic_ui_refresh)

    def _apply_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"), foreground="#38bdf8")
        style.configure("Card.TFrame", background="#1e293b", relief="flat")
        style.configure("TButton", font=("Segoe UI", 9, "bold"), padding=6)

    def _build_header(self):
        header_frame = tk.Frame(self.root, bg="#1e293b", height=70, padx=20, pady=12)
        header_frame.pack(fill=tk.X)

        title_lbl = tk.Label(
            header_frame,
            text="⚡ PrintFlow Agent",
            font=("Segoe UI", 16, "bold"),
            bg="#1e293b",
            fg="#38bdf8"
        )
        title_lbl.pack(side=tk.LEFT)

        self.status_badge = tk.Label(
            header_frame,
            text="● CONNECTING...",
            font=("Segoe UI", 9, "bold"),
            bg="#334155",
            fg="#cbd5e1",
            padx=10,
            pady=4
        )
        self.status_badge.pack(side=tk.RIGHT, padx=10)

        self.shop_label = tk.Label(
            header_frame,
            text="Shop: Not Paired",
            font=("Segoe UI", 10),
            bg="#1e293b",
            fg="#94a3b8"
        )
        self.shop_label.pack(side=tk.RIGHT, padx=15)

    def _build_content(self):
        container = tk.Frame(self.root, bg="#0f172a", padx=16, pady=12)
        container.pack(fill=tk.BOTH, expand=True)

        # Top Grid: Stats Cards
        stats_frame = tk.Frame(container, bg="#0f172a")
        stats_frame.pack(fill=tk.X, pady=(0, 12))

        self.card_device = self._create_card(stats_frame, "PC Device", self.controller.config.device_name)
        self.card_device.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

        self.card_pending = self._create_card(stats_frame, "Queue Active", "0 jobs")
        self.card_pending.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4)

        self.card_printed = self._create_card(stats_frame, "Completed", "0 jobs")
        self.card_printed.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0))

        # Main Notebook (Printers & Activity Log)
        notebook = ttk.Notebook(container)
        notebook.pack(fill=tk.BOTH, expand=True)

        # Tab 1: Printers
        printers_tab = tk.Frame(notebook, bg="#1e293b", padx=12, pady=12)
        notebook.add(printers_tab, text=" Windows Printers (USB / Wi-Fi) ")

        cols = ("Name", "Port / Connection", "Color", "Duplex", "Status")
        self.tree_printers = ttk.Treeview(printers_tab, columns=cols, show="headings", height=7)
        for col in cols:
            self.tree_printers.heading(col, text=col)
            self.tree_printers.column(col, width=130)

        self.tree_printers.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        scrollbar = ttk.Scrollbar(printers_tab, orient=tk.VERTICAL, command=self.tree_printers.yview)
        self.tree_printers.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Tab 2: Activity Logs
        logs_tab = tk.Frame(notebook, bg="#1e293b", padx=12, pady=12)
        notebook.add(logs_tab, text=" Live Print Spooler Activity ")

        self.log_text = tk.Text(logs_tab, bg="#0f172a", fg="#e2e8f0", font=("Consolas", 9), relief="flat")
        self.log_text.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        log_scroll = ttk.Scrollbar(logs_tab, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscroll=log_scroll.set)
        log_scroll.pack(side=tk.RIGHT, fill=tk.Y)

    def _create_card(self, parent, title: str, val: str):
        frame = tk.Frame(parent, bg="#1e293b", padx=14, pady=10, relief="flat", highlightthickness=1, highlightbackground="#334155")
        t_lbl = tk.Label(frame, text=title.upper(), font=("Segoe UI", 8, "bold"), bg="#1e293b", fg="#64748b")
        t_lbl.pack(anchor="w")
        v_lbl = tk.Label(frame, text=val, font=("Segoe UI", 12, "bold"), bg="#1e293b", fg="#f8fafc")
        v_lbl.pack(anchor="w", pady=(2, 0))
        frame.val_label = v_lbl
        return frame

    def _build_footer(self):
        footer = tk.Frame(self.root, bg="#1e293b", height=50, padx=16, pady=8)
        footer.pack(fill=tk.X, side=tk.BOTTOM)

        btn_pair = tk.Button(footer, text="Pair with Shop (PIN)", bg="#0284c7", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=4, command=self._show_pairing_dialog)
        btn_pair.pack(side=tk.LEFT, padx=(0, 8))

        btn_sync = tk.Button(footer, text="Sync Printers", bg="#334155", fg="#f8fafc", font=("Segoe UI", 9), relief="flat", padx=10, pady=4, command=self.controller.manual_sync)
        btn_sync.pack(side=tk.LEFT)

        self.heartbeat_lbl = tk.Label(footer, text="Heartbeat: OK", bg="#1e293b", fg="#64748b", font=("Segoe UI", 9))
        self.heartbeat_lbl.pack(side=tk.RIGHT)

    def _show_pairing_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("Pair Windows Computer with Shop")
        dialog.geometry("380x260")
        dialog.configure(bg="#0f172a", padx=20, pady=20)
        dialog.transient(self.root)
        dialog.grab_set()

        lbl1 = tk.Label(dialog, text="Device Pairing", font=("Segoe UI", 12, "bold"), bg="#0f172a", fg="#38bdf8")
        lbl1.pack(anchor="w")

        lbl2 = tk.Label(dialog, text="Enter the 6-digit pairing PIN shown on your PrintFlow Shop Owner Dashboard:", font=("Segoe UI", 9), bg="#0f172a", fg="#94a3b8", wraplength=340, justify="left")
        lbl2.pack(anchor="w", pady=(6, 12))

        pin_entry = tk.Entry(dialog, font=("Segoe UI", 14, "bold"), justify="center", bg="#1e293b", fg="#ffffff", insertbackground="white")
        pin_entry.pack(fill=tk.X, pady=(0, 16))
        pin_entry.focus_set()

        def submit():
            pin = pin_entry.get().strip()
            if len(pin) < 4:
                messagebox.showerror("Error", "Please enter a valid pairing PIN", parent=dialog)
                return
            res = self.controller.client.pair_device(pin)
            if res.get("success"):
                messagebox.showinfo("Success", f"Paired successfully with {res.get('shop_name', 'Shop')}!", parent=dialog)
                dialog.destroy()
                self._periodic_ui_refresh()
            else:
                messagebox.showerror("Pairing Failed", res.get("error", "Invalid or expired PIN"), parent=dialog)

        btn = tk.Button(dialog, text="Pair Device", bg="#0284c7", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", pady=6, command=submit)
        btn.pack(fill=tk.X)

    def append_log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)

    def _periodic_ui_refresh(self):
        config = self.controller.config
        if config.is_paired():
            self.status_badge.configure(text="● ONLINE", bg="#059669", fg="#ffffff")
            self.shop_label.configure(text=f"Shop: {config.shop_name}")
        else:
            self.status_badge.configure(text="● NOT PAIRED", bg="#d97706", fg="#ffffff")
            self.shop_label.configure(text="Shop: (Enter Pairing PIN)")

        self.card_pending.val_label.configure(text=f"{self.controller.stats['active']} active")
        self.card_printed.val_label.configure(text=f"{self.controller.stats['completed']} jobs")

        # Refresh printers tree
        for item in self.tree_printers.get_children():
            self.tree_printers.delete(item)

        for p in self.controller.printers:
            color_str = "Yes" if p.get("is_color_supported") else "No (B&W)"
            duplex_str = "Yes" if p.get("is_duplex_supported") else "No"
            status_str = p.get("status", "ready").upper()
            self.tree_printers.insert("", tk.END, values=(
                p.get("name", "Unknown"),
                p.get("port_name", "Local"),
                color_str,
                duplex_str,
                status_str
            ))

        self.root.after(3000, self._periodic_ui_refresh)

    def run(self):
        self.root.mainloop()
