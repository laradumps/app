<template>
    <div class="loading-children"></div>
</template>

<script setup>
import { defineProps, onMounted, getCurrentInstance, onBeforeUnmount } from "vue";

const props = defineProps({
    variableName: String,
    transitionId: Number
});

const { emit } = getCurrentInstance();

onMounted(() => {
    propertyGet(props.variableName);
});

const propertyGet = (variableName) => {
    const id = props.transitionId;
    console.log(`Children: Sending property_get for: ${variableName}`);

    // sendCommand(`feature_set -i ${id} -n max_children -v 100`);
    sendCommand(`property_get -i ${id} -n ${variableName} -m 0`);
};

const sendCommand = (cmd) => {
    window.ipcRenderer.send("send-xdebug-command", cmd);
};

const parseResponse = (xml) => {
    console.log(xml);
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const responseElement = doc.getElementsByTagName("response")[0];

    if (responseElement) {
        const command = responseElement.getAttribute("command");

        if (command === "property_get") {
            const properties = responseElement.getElementsByTagName("property");
            const childrenArray = [];

            Array.from(properties).forEach((property) => {
                const name = property.getAttribute("name");

                const fullname = property.getAttribute("fullname");
                const type = property.getAttribute("type");
                const facet = property.getAttribute("facet");
                const classname = property.getAttribute("classname");

                let valueElement = property.querySelector("cdata") || property;
                let value = valueElement.textContent;

                if (type === "string" && value) {
                    try {
                        value = atob(value);
                    } catch (e) {
                        console.error("Error decoding Base64:", e);
                    }
                }

                function formatValue(type, value) {
                    if (type === "bool") {
                        return value === "1" ? "true" : "false";
                    }

                    return value;
                }

                const propertyObject = {
                    name,
                    fullname,
                    type,
                    facet,
                    classname,
                    value: formatValue(type, value),
                    expanded: false,
                    children: []
                };

                childrenArray.push(propertyObject);
            });

            if (childrenArray.length > 0) {
                childrenArray.shift();
            }

            console.log(childrenArray);
            return childrenArray;
        }
    }

    return [];
};

const handleResponse = (event, response) => {
    const newChildren = parseResponse(response);
    emit("loaded", newChildren);
};

onMounted(() => {
    window.ipcRenderer.on("xdebug-response", handleResponse);
});

onBeforeUnmount(() => {
    window.ipcRenderer.removeListener("xdebug-response", handleResponse);
});
</script>
