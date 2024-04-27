import { world, system } from "@minecraft/server";
import { DynamicDB } from "./database";
import config from "./config";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { forceShow } from "./Functions/forceShow";
import { parseDuration, calculateDuration } from "./Functions/parseDuration";
import { millisecondsToTime } from "./Functions/millisecondsToTime"
console.warn("[Kit system] §l§aReloaded!")

const overworld = world.getDimension("overworld")
overworld.runCommandAsync(`tickingarea add circle 8 0 8 4 "KitDatabase" true`)
const KitDB = new DynamicDB("KitDB", world)
const PlayerDB = new DynamicDB("PlayerDB", world)
if (!KitDB.get("KitDB")) {
    KitDB.set("KitDB", [])
    KitDB.save()
}

world.beforeEvents.chatSend.subscribe((data) => {
    const { sender: player, message } = data
    if (message.toLowerCase().startsWith(`${config.cmd_prefix}kit`)) {
        data.cancel = true
        const args = message.split(" ")
        if (!args[1]) return player.sendMessage(config.prefix + `Use §g${config.cmd_prefix}kit help`);
        if (args[1] == "help") {
            player.sendMessage("§2--- Help for commands ---")
            player.sendMessage(`${config.cmd_prefix}kit help - help for commands`)
            player.sendMessage(`${config.cmd_prefix}kit menu - kit UI`)
            player.sendMessage(`${config.cmd_prefix}kit clear - clear all kits`)
            player.sendMessage(`${config.cmd_prefix}kit take <name> - take kit`)
        } else if (args[1] == "menu") {
            if (!player.hasTag(config.admin_tag)) return player.sendMessage(config.prefix + "You don't have enough rights.");
            system.run(() => KitUI(player))
        } else if (args[1] == "clear") {
            if (!player.hasTag(config.admin_tag)) return player.sendMessage(config.prefix + "You don't have enough rights.");
            overworld.runCommandAsync("event entity @e[type=kit:database] minecraft:despawn")
            KitDB.set("KitDB", [])
            PlayerDB.clear()
            KitDB.save()
            PlayerDB.save()
            player.sendMessage(config.prefix + "All kits have been successfully removed!")
        } else if (args[1] == "take") {
            let kits = KitDB.get("KitDB").map(kit => kit.name);
            if (!args[2]) {
                if (kits.length == 0) return player.sendMessage(config.prefix + "There are no kits on the server yet!");
                return player.sendMessage(config.prefix + `Kits: §g${kits.join("§r, §g")}`);
            }
            if (!kits.includes(args[2])) return player.sendMessage(config.prefix + "A kit by that name doesn't exist!");
            if (!PlayerDB.get(player.name)) {
                PlayerDB.set(player.name, {
                    time: 0
                })
            }
            const kit = KitDB.get("KitDB").filter(db => db.name == args[2])[0]
            if (PlayerDB.get(player.name).time > Date.now()) return player.sendMessage(config.prefix + `Wait for §g${calculateDuration(PlayerDB.get(player.name).time - Date.now())}§f!`);
            if (kit.tags.length > 0) {
                if (!kit.tags.some(item => player.getTags().includes(item))) return player.sendMessage(config.prefix + "You don't have enough rights.")
            }
            const [entity] = overworld.getEntities({ type: "kit:database" }).filter(e => e.nameTag == `Kit:${args[2]}`)
            const inventory = player.getComponent("inventory").container
            const entity_inv = entity.getComponent("inventory").container
            if (entity_inv.emptySlotsCount == 41) {
                player.sendMessage(config.prefix + "This kit does not have a loot set up yet!")
                if (player.hasTag(config.admin_tag)) {
                    player.sendMessage(config.prefix + `Go to §g${config.cmd_prefix}kit menu §f-> §gKit list§f-> §g${args[0]}§r to set up the loot!`)
                }
                return;
            }
            const equipment = player.getComponent("equippable");
            for (let i = 0; i < 5; i++) {
                const item = entity_inv.getItem(i);
                const slotName = ["Offhand", "Head", "Chest", "Legs", "Feet"][i];
                const equippedItem = system.run(() => equipment.getEquipment(slotName));
                if (item) {
                    if (equippedItem) {
                        if (inventory.emptySlotsCount > 0) {
                            system.run(() => inventory.addItem(item));
                        } else {
                            system.run(() => player.dimension.spawnItem(equippedItem, player.location));
                        }
                    } else {
                        system.run(() => equipment.setEquipment(slotName, item));
                    }
                }
            }
            for (let i = 5; i < 41; i++) {
                const item = entity_inv.getItem(i);
                if (item) {
                    if (inventory.emptySlotsCount > 0) {
                        system.run(() => inventory.addItem(item));
                    } else {
                        system.run(() => player.dimension.spawnItem(item, player.location));
                    }
                }
            }
            player.sendMessage(config.prefix + `You got the kit §g${args[2]}§r!`)
            PlayerDB.get(player.name).time = Date.now() + parseDuration(kit.time)
            PlayerDB.save()
        } else {
            player.sendMessage(config.prefix + `Unknown argument! Use §g${config.cmd_prefix}kit help`);
        }
    }
})



async function KitUI(player) {
    const form = new ActionFormData()
    .title("Kit menu")
    .button("Create kit", "textures/ui/color_plus")
    .button("Kit list", "textures/ui/feedIcon")
    const response = await forceShow(player, form)
    if (response.selection == 0) {
        new ModalFormData()
        .title("Create kit")
        .textField("Name", "test, kit1...")
        .textField("Cooldown", "30m, 12h, 30d12h30m...")
        .show(player).then(async (result) => {
            if (result.canceled) return;
            const name = result.formValues[0]
            const time = result.formValues[1]
            if (!name.length || !time.length) return player.sendMessage(config.prefix + "All fields must be filled in!");
            if (!/^[a-zA-Z0-9]+$/.test(name)) return player.sendMessage(config.prefix + "The name of the kit can only contain english letters and numbers!");
            if (!/\d[ywdhms]/.test(time)) return player.sendMessage(config.prefix + "Wrong time!");
            if (overworld.getEntities({ type: "kit:database" }).filter(e  => e.nameTag == name).length) return player.sendMessage(config.prefix + "A kit with that name already exists!");
            KitDB.get("KitDB").push({
                name: name.toLowerCase(),
                time: time,
                tags: []
            })
            KitDB.save()
            const entity = await overworld.spawnEntity("kit:database", { x: 8, y: 0, z: 8 })
            entity.nameTag = `Kit:${name}`
            player.sendMessage(config.prefix + `You have successfully created a kit called §g${name.toLowerCase()}§r!`)
            player.sendMessage(config.prefix + `Cooldown: §g${millisecondsToTime(parseDuration(time))}`)
            player.sendMessage(config.prefix + `Go to §g${config.cmd_prefix}kit menu §f-> §gKit list §f-> §g${name.toLowerCase()} §fto setup the kit!`)
        })
    } else if (response.selection == 1) {
        const form1 = new ActionFormData()
        .title("Kit list")
        for (const kit of KitDB.get("KitDB")) {
            form1.button(kit.name)
        }
        form1.show(player).then((result) => {
            if (result.canceled) return;
            const kit = KitDB.get("KitDB")[result.selection]
            new ActionFormData()
            .title(`${kit.name}`)
            .button("Set loot", "textures/items/diamond_sword")
            .button("Edit cooldown", "textures/items/clock_item")
            .button("Tags", "textures/ui/Feedback")
            .show(player).then((result1) => {
                if (result1.canceled) return;
                if (result1.selection == 0) {
                    const inventory = player.getComponent("inventory").container
                    const equipment = player.getComponent("equippable")

                    const Offhand = equipment.getEquipment("Offhand")
                    const Head = equipment.getEquipment("Head")
                    const Chest = equipment.getEquipment("Chest")
                    const Legs = equipment.getEquipment("Legs")
                    const Feet = equipment.getEquipment("Feet")
                    if (inventory.emptySlotsCount == 36 && !Offhand && !Head && !Chest && !Legs && !Feet) return player.sendMessage(config.prefix + "Wear or take items in your inventory that you want to add to the kit!");
                    const [entity] = overworld.getEntities({ type: "kit:database" }).filter(e => e.nameTag == `Kit:${kit.name}`)
                    const entity_inv = entity.getComponent("inventory").container

                    if (Offhand) { entity_inv.setItem(0, Offhand) }
                    if (Head) { entity_inv.setItem(1, Head) }
                    if (Chest) { entity_inv.setItem(2, Chest) }
                    if (Legs) { entity_inv.setItem(3, Legs) }
                    if (Feet) { entity_inv.setItem(4, Feet) }

                    for (let i = 5; i < 41; i++) {
                        const item = inventory.getItem(i - 5)
                        if (item) { entity_inv.setItem(i, item) }
                    }
                    player.sendMessage(config.prefix + `You have successfully upgraded the loot in the kit §g${kit.name}§r!`)
                } else if (result1.selection == 1) {
                    new ModalFormData()
                    .title("Cooldown")
                    .textField("Time", "30m, 12h, 30d12h30m...", kit.time)
                    .show(player).then((result2) => {
                        if (result2.canceled) return;
                        const time = result2.formValues[0]
                        if (!time.length) return player.sendMessage(config.prefix + "Enter the time!");
                        if (!/\d[ywdhms]/.test(time)) return player.sendMessage(config.prefix + "Wrong time!");
                        kit.time = time
                        KitDB.save()
                        player.sendMessage(config.prefix + `You have successfully changed the delay in the kit §g${kit.name}§r!`)
                    })
                } else if (result1.selection == 2) {
                    new ActionFormData()
                    .title("Tags")
                    .button("Add tag", "textures/ui/color_plus")
                    .button("Tag list", "textures/ui/feedIcon")
                    .show(player).then((result3) => {
                        if (result3.canceled) return;
                        if (result3.selection == 0) {
                            new ModalFormData()
                            .title("Add tag")
                            .textField("Tag", "¶l¶aVIP, Premium...")
                            .show(player).then((result4) => {
                                if (result4.canceled) return;
                                const tag = result4.formValues[0]
                                if (!tag.length) return player.sendMessage(config.prefix + "Enter the tag!")
                                if (kit.tags.includes(tag)) return player.sendMessage(config.prefix + "This tag already exists in this kit!")
                                kit.tags.push(tag)
                                KitDB.save()
                                player.sendMessage(config.prefix + `You have successfully added the tag ${tag}§r to the kit §g${kit.name}§r!`)
                            })
                        } else if (result3.selection == 1) {
                            if (kit.tags.length < 1) return player.sendMessage(config.prefix + "There are no tags in this kit!")
                            new ModalFormData()
                            .title("Tag list")
                            .dropdown("Select the tag to be deleted", kit.tags)
                            .show(player).then((result4) => {
                                if (result4.canceled) return;
                                const tag = result4.formValues[0]
                                const index = kit.tags.indexOf(tag)
                                kit.tags.splice(index, 1)
                                KitDB.save()
                                player.sendMessage(config.prefix + `The tag has been removed from the kit §g${kit.name}§r!`)
                            })
                        }
                    })
                }
            })
        })
    }
}
