class MeetingTracker {
    constructor() {
        this.webhooks = JSON.parse(localStorage.getItem('webhooks') || '[]');
        this.init();
    }

    init() {
        this.render();
        this.attachListeners();
    }

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container">
                <h1>Meeting Action Tracker</h1>
                
                <div class="header-info">
                    <div class="field-group">
                        <label>Meeting Name</label>
                        <input type="text" id="meetingName" placeholder="e.g., Weekly Team Sync">
                    </div>
                    <div class="field-group">
                        <label>Date</label>
                        <input type="date" id="meetingDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>

                <div class="section">
                    <h2>Action Items</h2>
                    <table class="action-table">
                        <thead>
                            <tr>
                                <th style="width: 25%">Who</th>
                                <th style="width: 50%">What</th>
                                <th style="width: 25%">When</th>
                            </tr>
                        </thead>
                        <tbody id="actionItems">
                            ${[1,2,3,4,5,6].map(i => `
                                <tr>
                                    <td><input type="text" class="who" placeholder="Name"></td>
                                    <td><input type="text" class="what" placeholder="Task description"></td>
                                    <td><input type="text" class="when" placeholder="Due date"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>Decisions Made</h2>
                    <div id="decisions">
                        ${[1,2,3].map(i => `
                            <div style="margin-bottom: 10px;">
                                <input type="text" class="decision" placeholder="Key decision" style="width: 100%;">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <h2>Follow-up Questions</h2>
                    <div id="questions">
                        ${[1,2,3].map(i => `
                            <div style="margin-bottom: 10px;">
                                <input type="text" class="question" placeholder="Research question" style="width: 100%;">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="button-group">
                    <button class="btn" onclick="app.clearForm()">Clear Form</button>
                    <button class="btn btn-slack" onclick="app.showSettings()">⚙️ Slack Settings</button>
                    <button class="btn btn-slack" onclick="app.showSendModal()">📤 Send to Slack</button>
                </div>
            </div>

            <div id="settingsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="app.closeModal('settingsModal')">&times;</span>
                    <h2>Slack Webhook Settings</h2>
                    <div id="webhookList"></div>
                    <button class="btn btn-success" onclick="app.addWebhook()">+ Add Webhook</button>
                    <button class="btn btn-slack" onclick="app.saveSettings()">Save Settings</button>
                </div>
            </div>

            <div id="sendModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="app.closeModal('sendModal')">&times;</span>
                    <h2>Send to Slack</h2>
                    <div id="channelList" class="channel-select"></div>
                    <button class="btn btn-slack" onclick="app.sendToSlack()">Send to Selected Channels</button>
                </div>
            </div>
        `;
    }

    attachListeners() {
        // Add any additional listeners here
    }

    clearForm() {
        if (confirm('Clear all fields?')) {
            document.querySelectorAll('input[type="text"]').forEach(input => input.value = '');
            document.getElementById('meetingDate').value = new Date().toISOString().split('T')[0];
        }
    }

    showSettings() {
        this.renderWebhooks();
        document.getElementById('settingsModal').style.display = 'block';
    }

    showSendModal() {
        if (this.webhooks.length === 0) {
            alert('Please configure Slack webhooks first!');
            this.showSettings();
            return;
        }
        this.renderChannels();
        document.getElementById('sendModal').style.display = 'block';
    }

    closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    renderWebhooks() {
        const container = document.getElementById('webhookList');
        container.innerHTML = this.webhooks.map((webhook, index) => `
            <div class="webhook-item">
                <input type="text" placeholder="Channel name" value="${webhook.channel || ''}" 
                       onchange="app.updateWebhook(${index}, 'channel', this.value)">
                <input type="text" placeholder="Webhook URL" value="${webhook.url || ''}" 
                       onchange="app.updateWebhook(${index}, 'url', this.value)">
                <button class="btn btn-danger" onclick="app.removeWebhook(${index})">Remove</button>
            </div>
        `).join('');
    }

    renderChannels() {
        const container = document.getElementById('channelList');
        container.innerHTML = this.webhooks.map((webhook, index) => `
            <label class="channel-option">
                <input type="checkbox" value="${index}" checked>
                <span>${webhook.channel || 'Unnamed Channel'}</span>
            </label>
        `).join('');
    }

    addWebhook() {
        this.webhooks.push({ channel: '', url: '' });
        this.renderWebhooks();
    }

    updateWebhook(index, field, value) {
        this.webhooks[index][field] = value;
    }

    removeWebhook(index) {
        this.webhooks.splice(index, 1);
        this.renderWebhooks();
    }

    saveSettings() {
        localStorage.setItem('webhooks', JSON.stringify(this.webhooks));
        alert('Settings saved!');
        this.closeModal('settingsModal');
    }

    async sendToSlack() {
        const selected = Array.from(document.querySelectorAll('#channelList input:checked'))
            .map(cb => this.webhooks[cb.value]);

        if (selected.length === 0) {
            alert('Please select at least one channel!');
            return;
        }

        const message = this.formatMessage();
        let results = [];

        for (const webhook of selected) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });
                
                if (response.ok) {
                    results.push(`✅ ${webhook.channel}`);
                } else {
                    results.push(`❌ ${webhook.channel}: ${response.statusText}`);
                }
            } catch (error) {
                results.push(`❌ ${webhook.channel}: ${error.message}`);
            }
        }

        alert('Results:\\n' + results.join('\\n'));
        if (results.some(r => r.startsWith('✅'))) {
            this.closeModal('sendModal');
        }
    }

    formatMessage() {
        const meeting = document.getElementById('meetingName').value || 'Meeting';
        const date = document.getElementById('meetingDate').value;
        
        // Collect action items
        const actionItems = [];
        document.querySelectorAll('#actionItems tr').forEach(row => {
            const who = row.querySelector('.who').value;
            const what = row.querySelector('.what').value;
            const when = row.querySelector('.when').value;
            if (who && what) {
                actionItems.push(`• *${who}* → ${what} _(${when || 'TBD'})_`);
            }
        });

        // Collect decisions
        const decisions = Array.from(document.querySelectorAll('.decision'))
            .map(input => input.value)
            .filter(v => v)
            .map(v => `• ${v}`);

        // Collect questions
        const questions = Array.from(document.querySelectorAll('.question'))
            .map(input => input.value)
            .filter(v => v)
            .map(v => `• ${v}`);

        // Build Slack blocks
        const blocks = [
            {
                type: "header",
                text: { type: "plain_text", text: `📋 ${meeting}` }
            },
            {
                type: "context",
                elements: [{ type: "mrkdwn", text: `*Date:* ${date}` }]
            },
            { type: "divider" }
        ];

        if (actionItems.length > 0) {
            blocks.push({
                type: "section",
                text: { type: "mrkdwn", text: `*🎯 Action Items*\n${actionItems.join('\n')}` }
            });
        }

        if (decisions.length > 0) {
            blocks.push(
                { type: "divider" },
                {
                    type: "section",
                    text: { type: "mrkdwn", text: `*✅ Decisions*\n${decisions.join('\n')}` }
                }
            );
        }

        if (questions.length > 0) {
            blocks.push(
                { type: "divider" },
                {
                    type: "section",
                    text: { type: "mrkdwn", text: `*❓ Questions*\n${questions.join('\n')}` }
                }
            );
        }

        return { text: `Meeting Notes: ${meeting}`, blocks };
    }
}

// Initialize app
const app = new MeetingTracker();
