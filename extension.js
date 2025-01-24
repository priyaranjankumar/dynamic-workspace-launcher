import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

export default class DynamicWorkspaceLauncher extends Extension {
  constructor(metadata) {
    super(metadata);
    this._windowTracker = null;
    this._workspaceManager = null;
    this._signalId = null;
    this._launchedApps = new Set();
    this._currentWorkspaceIndex = 0;
  }

  enable() {
    try {
      this._windowTracker = Shell.WindowTracker.get_default();
      if (!this._windowTracker) {
        throw new Error("Shell.WindowTracker is undefined");
      }

      this._workspaceManager = global.workspace_manager;

      this._signalId = global.display.connect(
        "window-created",
        this._onWindowCreated.bind(this)
      );
      console.log("Dynamic Workspace Launcher enabled successfully.");
    } catch (error) {
      console.error("Dynamic Workspace Launcher - Enable Error:", error);
    }
  }

  disable() {
    try {
      if (this._signalId) {
        global.display.disconnect(this._signalId);
        this._signalId = null;
      }

      this._launchedApps.clear();
      this._currentWorkspaceIndex = 0;
      console.log("Dynamic Workspace Launcher disabled successfully.");
    } catch (error) {
      console.error("Dynamic Workspace Launcher - Disable Error:", error);
    }
  }

  _onWindowCreated(display, window) {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
      try {
        const app = this._windowTracker.get_window_app(window);
        if (!app) {
          return false;
        }

        const appId = app.get_id().replace(".desktop", "");

        if (!this._launchedApps.has(appId)) {
          const nWorkspaces = this._workspaceManager.get_n_workspaces();
          if (this._currentWorkspaceIndex >= nWorkspaces) {
            this._workspaceManager.append_new_workspace(
              false,
              global.get_current_time()
            );
          }

          window.change_workspace_by_index(this._currentWorkspaceIndex, false);
          this._launchedApps.add(appId);
          this._currentWorkspaceIndex++;

          // Activate the new workspace
          const newWorkspace = this._workspaceManager.get_workspace_by_index(
            this._currentWorkspaceIndex - 1
          );
          newWorkspace.activate(global.get_current_time());
        }
      } catch (error) {
        console.error(
          "Dynamic Workspace Launcher - Window Creation Error:",
          error
        );
      }
      return false;
    });
  }
}
